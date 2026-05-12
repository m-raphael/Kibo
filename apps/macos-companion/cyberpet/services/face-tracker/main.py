#!/usr/bin/env python3
"""
CyberPet face tracker.
Reads the default camera, detects face landmarks via MediaPipe FaceMesh,
and emits one JSON line per frame to stdout.

JSON schema per frame:
  {
    "face_detected": bool,
    "head_pose":     {"yaw": float, "pitch": float, "roll": float},  // degrees
    "blink":         float,   // 0.0 (open) .. 1.0 (closed)
    "smile":         float,   // 0.0 (neutral) .. 1.0 (full smile)
    "mouth_open":    float    // 0.0 (closed) .. 1.0 (wide open)
  }
  or {"error": "<reason>"} if a fatal error occurs.
"""

import os
import sys
import json
import math

try:
    import cv2
    import mediapipe as mp
    import numpy as np
except ImportError as exc:
    print(json.dumps({"error": f"missing_dependency:{exc}"}), flush=True)
    sys.exit(1)

# Appearance detection uses face geometry ONLY (no biometrics, no identity).
# geometry_key is a coarse category (~10 000 buckets) — not uniquely identifying.

# ---------------------------------------------------------------------------
# Landmark indices (MediaPipe canonical face mesh, 468 points)
# ---------------------------------------------------------------------------

# 3-D model points for solvePnP head-pose estimation
_MODEL_POINTS = np.array([
    [ 0.0,    0.0,   0.0],    # 1  – nose tip
    [ 0.0, -330.0, -65.0],   # 152 – chin
    [-225.0, 170.0, -135.0], # 33  – left eye outer corner
    [ 225.0, 170.0, -135.0], # 263 – right eye outer corner
    [-150.0, -150.0, -125.0],# 61  – left mouth corner
    [ 150.0, -150.0, -125.0],# 291 – right mouth corner
], dtype=np.float64)
_POSE_IDS = [1, 152, 33, 263, 61, 291]

# Eye aspect-ratio (EAR) landmark rings [P1,P2,P3,P4,P5,P6]
_L_EYE = [33, 160, 158, 133, 153, 144]
_R_EYE = [362, 385, 387, 263, 373, 380]

# Mouth landmarks
_MOUTH_TOP    = 13
_MOUTH_BOTTOM = 14
_MOUTH_LEFT   = 61
_MOUTH_RIGHT  = 291

# Smile: outer lip corners vs face width
_FACE_LEFT  = 33
_FACE_RIGHT = 263

# Face shape — outer geometry
_FOREHEAD   = 10
_CHIN       = 152
_L_CHEEK    = 234   # left cheek / ear junction (max face width)
_R_CHEEK    = 454   # right cheek / ear junction
_L_JAW      = 172   # left jaw corner
_R_JAW      = 397   # right jaw corner
_L_TEMPLE   = 103   # left temporal
_R_TEMPLE   = 332   # right temporal

# Eye shape — single-eye vertical pair
_L_EYE_TOP  = 159
_L_EYE_BOT  = 145
_R_EYE_TOP  = 386
_R_EYE_BOT  = 374

# ---------------------------------------------------------------------------
# Feature functions
# ---------------------------------------------------------------------------

def _pt(lm, idx, w, h):
    l = lm[idx]
    return (l.x * w, l.y * h)

def _ear(lm, ids, w, h):
    p = [_pt(lm, i, w, h) for i in ids]
    a = math.dist(p[1], p[5])
    b = math.dist(p[2], p[4])
    c = math.dist(p[0], p[3])
    return (a + b) / (2.0 * c) if c > 0 else 0.3

def _head_pose(lm, w, h):
    img_pts = np.array([_pt(lm, i, w, h) for i in _POSE_IDS], dtype=np.float64)
    focal = float(w)
    cam = np.array([[focal, 0, w / 2],
                    [0, focal, h / 2],
                    [0, 0, 1]], dtype=np.float64)
    ok, rvec, _ = cv2.solvePnP(
        _MODEL_POINTS, img_pts, cam, np.zeros((4, 1)),
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not ok:
        return 0.0, 0.0, 0.0
    rmat, _ = cv2.Rodrigues(rvec)
    sy = math.sqrt(rmat[0, 0] ** 2 + rmat[1, 0] ** 2)
    pitch = math.degrees(math.atan2(-rmat[2, 0], sy))
    yaw   = math.degrees(math.atan2(rmat[1, 0], rmat[0, 0]))
    roll  = math.degrees(math.atan2(rmat[2, 1], rmat[2, 2]))
    return round(yaw, 1), round(pitch, 1), round(roll, 1)

def _blink(lm, w, h):
    l = _ear(lm, _L_EYE, w, h)
    r = _ear(lm, _R_EYE, w, h)
    avg = (l + r) / 2.0
    # EAR open ~0.30, closed ~0.15 → map to 0..1 blink score
    return round(max(0.0, min(1.0, 1.0 - (avg - 0.15) / 0.15)), 3)

def _mouth_open(lm, w, h):
    top  = _pt(lm, _MOUTH_TOP,    w, h)
    bot  = _pt(lm, _MOUTH_BOTTOM, w, h)
    lft  = _pt(lm, _MOUTH_LEFT,   w, h)
    rgt  = _pt(lm, _MOUTH_RIGHT,  w, h)
    vert  = abs(top[1] - bot[1])
    horiz = abs(lft[0] - rgt[0])
    return round(min(1.0, vert / horiz) if horiz > 0 else 0.0, 3)

def _face_shape(lm, w, h):
    face_w   = math.dist(_pt(lm, _L_CHEEK, w, h),  _pt(lm, _R_CHEEK, w, h))
    face_h   = math.dist(_pt(lm, _FOREHEAD, w, h),  _pt(lm, _CHIN, w, h))
    jaw_w    = math.dist(_pt(lm, _L_JAW, w, h),     _pt(lm, _R_JAW, w, h))
    temple_w = math.dist(_pt(lm, _L_TEMPLE, w, h),  _pt(lm, _R_TEMPLE, w, h))
    if face_w < 1:
        return 'oval'
    ht  = face_h / face_w
    jaw = jaw_w  / face_w
    tmp = temple_w / face_w
    if ht > 1.45:               return 'oblong'
    if ht < 0.90:               return 'round'
    if jaw < 0.72 and tmp > 0.82: return 'heart'
    if jaw > 0.88:              return 'square'
    return 'oval'


def _eye_shape(lm, w, h):
    l_outer  = _pt(lm, _L_EYE[0], w, h)
    l_inner  = _pt(lm, _L_EYE[3], w, h)
    l_top    = _pt(lm, _L_EYE_TOP, w, h)
    l_bot    = _pt(lm, _L_EYE_BOT, w, h)
    r_outer  = _pt(lm, _R_EYE[3], w, h)
    r_inner  = _pt(lm, _R_EYE[0], w, h)
    r_top    = _pt(lm, _R_EYE_TOP, w, h)
    r_bot    = _pt(lm, _R_EYE_BOT, w, h)

    def ratio(outer, inner, top, bot):
        ew = math.dist(outer, inner)
        eh = math.dist(top, bot)
        return eh / ew if ew > 0 else 0.25

    def slant(outer, inner, ew):
        # positive → outer corner higher than inner (almond tilt)
        return (inner[1] - outer[1]) / ew if ew > 0 else 0

    l_ew   = math.dist(l_outer, l_inner)
    r_ew   = math.dist(r_outer, r_inner)
    ar     = (ratio(l_outer, l_inner, l_top, l_bot) +
              ratio(r_outer, r_inner, r_top, r_bot)) / 2
    slants = (slant(l_outer, l_inner, l_ew) +
              slant(r_outer, r_inner, r_ew)) / 2

    if ar < 0.20:               return 'narrow'
    if ar > 0.34:               return 'round'
    if slants > 0.04:           return 'almond'
    return 'wide'


def _skin_tone(lm, frame, w, h):
    pts = [_pt(lm, _FOREHEAD, w, h),
           _pt(lm, _L_CHEEK,  w, h),
           _pt(lm, _R_CHEEK,  w, h)]
    samples = []
    for (px, py) in pts:
        x, y = int(px), int(py)
        if 0 <= x < w and 0 <= y < h:
            b, g, r = frame[y, x]
            samples.append((int(r), int(g), int(b)))
    if not samples:
        return 'neutral-medium'
    avg_r = sum(s[0] for s in samples) / len(samples)
    avg_g = sum(s[1] for s in samples) / len(samples)
    avg_b = sum(s[2] for s in samples) / len(samples)
    lum   = 0.299 * avg_r + 0.587 * avg_g + 0.114 * avg_b
    warm  = avg_r - avg_b
    tone  = 'light' if lum > 175 else ('dark' if lum < 95 else 'medium')
    hue   = 'warm' if warm > 18 else ('cool' if warm < -12 else 'neutral')
    return f'{hue}-{tone}'


def _geometry_key(lm, w, h):
    """Coarse geometric fingerprint — NOT a biometric identifier.
    Encodes 4 face proportion ratios as single letters (A–P each = 0.0–1.5 in 0.1 steps).
    ~10 000 categories total; many people share the same key."""
    face_w = math.dist(_pt(lm, _L_CHEEK, w, h),   _pt(lm, _R_CHEEK, w, h))
    face_h = math.dist(_pt(lm, _FOREHEAD, w, h),  _pt(lm, _CHIN, w, h))
    iod    = math.dist(_pt(lm, _L_EYE[0], w, h),  _pt(lm, _R_EYE[0], w, h))
    mw     = math.dist(_pt(lm, _MOUTH_LEFT, w, h), _pt(lm, _MOUTH_RIGHT, w, h))
    if face_w < 1:
        return 'AAAA'
    def enc(v):
        return chr(ord('A') + min(max(int(round(v, 1) * 10), 0), 15))
    return (enc(face_h / face_w) +
            enc(iod    / face_w) +
            enc(mw     / face_w) +
            enc(math.dist(_pt(lm, _L_JAW, w, h), _pt(lm, _R_JAW, w, h)) / face_w))


def _smile(lm, w, h):
    nose     = _pt(lm, 1, w, h)
    lft_c    = _pt(lm, _MOUTH_LEFT,  w, h)
    rgt_c    = _pt(lm, _MOUTH_RIGHT, w, h)
    face_w   = abs(lm[_FACE_LEFT].x - lm[_FACE_RIGHT].x) * w
    stretch  = (math.dist(lft_c, nose) + math.dist(rgt_c, nose)) / face_w if face_w > 0 else 0
    # Resting ~0.55–0.60, full smile ~0.85–0.90 → normalise to 0..1
    return round(max(0.0, min(1.0, (stretch - 0.55) / 0.35)), 3)

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

_NULL_FRAME = {
    "face_detected": False,
    "head_pose": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0},
    "blink": 0.0,
    "smile": 0.0,
    "mouth_open": 0.0,
}

def _emit(data):
    print(json.dumps(data), flush=True)

def run():
    cam_index  = int(os.environ.get('CYBERPET_CAMERA_INDEX', 0))
    detect_cf  = float(os.environ.get('CYBERPET_DETECTION_CONFIDENCE', 0.5))
    track_cf   = float(os.environ.get('CYBERPET_TRACKING_CONFIDENCE', 0.5))

    cap = cv2.VideoCapture(cam_index)
    if not cap.isOpened():
        _emit({"error": "camera_unavailable"})
        return

    mp_face = mp.solutions.face_mesh
    with mp_face.FaceMesh(
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=detect_cf,
        min_tracking_confidence=track_cf,
    ) as mesh:
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break

            h, w = frame.shape[:2]
            results = mesh.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

            if not results.multi_face_landmarks:
                _emit(_NULL_FRAME)
                continue

            lm = results.multi_face_landmarks[0].landmark
            yaw, pitch, roll = _head_pose(lm, w, h)

            _emit({
                "face_detected": True,
                "head_pose": {"yaw": yaw, "pitch": pitch, "roll": roll},
                "blink":      _blink(lm, w, h),
                "smile":      _smile(lm, w, h),
                "mouth_open": _mouth_open(lm, w, h),
                "appearance": {
                    "face_shape":   _face_shape(lm, w, h),
                    "eye_shape":    _eye_shape(lm, w, h),
                    "skin_tone":    _skin_tone(lm, frame, w, h),
                    "geometry_key": _geometry_key(lm, w, h),
                },
            })

    cap.release()
    _emit({"error": "camera_closed"})

if __name__ == "__main__":
    run()
