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
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        _emit({"error": "camera_unavailable"})
        return

    mp_face = mp.solutions.face_mesh
    with mp_face.FaceMesh(
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
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
                "blink": _blink(lm, w, h),
                "smile": _smile(lm, w, h),
                "mouth_open": _mouth_open(lm, w, h),
            })

    cap.release()
    _emit({"error": "camera_closed"})

if __name__ == "__main__":
    run()
