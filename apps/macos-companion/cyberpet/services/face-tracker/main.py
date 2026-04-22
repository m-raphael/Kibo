import json

state = {
    "face_detected": False,
    "head_pose": {"yaw": 0, "pitch": 0, "roll": 0},
    "blink": 0.0,
    "smile": 0.0,
    "mouth_open": 0.0
}

print(json.dumps(state))
