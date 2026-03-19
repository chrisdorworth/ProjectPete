"""Model registry — loads active model versions."""

import os
import joblib
from pathlib import Path
from typing import Optional, Any


class ModelRegistry:
    def __init__(self):
        self._models: dict[str, Any] = {}
        self._versions: dict[str, str] = {}
        self._model_dir = Path(os.environ.get("MODEL_DIR", "models"))
        self._load_models()

    def _load_models(self) -> None:
        """Load all .joblib models from the model directory."""
        if not self._model_dir.exists():
            return

        for model_file in self._model_dir.glob("*.joblib"):
            name = model_file.stem.rsplit("_v", 1)[0]
            version = model_file.stem.rsplit("_v", 1)[-1] if "_v" in model_file.stem else "1.0.0"
            self._models[name] = joblib.load(model_file)
            self._versions[name] = version

    def get_model(self, name: str) -> Optional[Any]:
        return self._models.get(name)

    def get_version(self, name: str) -> str:
        return self._versions.get(name, "unknown")

    def get_loaded_models(self) -> list[str]:
        return list(self._models.keys())

    def load_model(self, name: str, path: str, version: str) -> None:
        self._models[name] = joblib.load(path)
        self._versions[name] = version

    def unload_model(self, name: str) -> None:
        self._models.pop(name, None)
        self._versions.pop(name, None)
