// TypeScript version of scene.json for development
// This avoids fetch issues during local development

export const sceneData = {
  "ecs7": true,
  "runtimeVersion": "7",
  "display": {
    "title": "SDK7 Scene Template",
    "description": "template scene with SDK7",
    "navmapThumbnail": "images/scene-thumbnail.png",
    "favicon": "favicon_asset"
  },
  "owner": "",
  "contact": {
    "name": "SDK",
    "email": ""
  },
  "main": "bin/index.js",
  "tags": [],
  "scene": {
    "parcels": [
      "0,0",
      "0,1",
      "0,2",
      "0,3",
      "0,4",
      "1,0",
      "1,1",
      "1,2",
      "1,3",
      "1,4",
      "2,0",
      "2,1",
      "2,2",
      "2,3",
      "2,4",
      "3,0",
      "3,1",
      "3,2",
      "3,3",
      "3,4",
      "4,0",
      "4,1",
      "4,2",
      "4,3",
      "4,4"
    ],
    "base": "2,2"
  },
  "spawnPoints": [
    {
      "name": "spawn1",
      "default": true,
      "position": {
        "x": [
          -5,
          5
        ],
        "y": [
          0,
          0
        ],
        "z": [
          -5,
          5
        ]
      },
      "cameraTarget": {
        "x": 0,
        "y": 2,
        "z": 8
      }
    }
  ],
  "featureToggles": {
    "voiceChat": "enabled",
    "portableExperiences": "enabled"
  },
  "skyboxConfig": {}
}