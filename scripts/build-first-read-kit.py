"""Build a deterministic, credential-free documentation archive (stdlib only)."""

import csv
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[1]
NAME = "appstruct-n8n-cloud-first-read-kit-20261126"
SOURCES = {
    "01-list-projects-read-only.json": "examples/list-projects-read-only.json",
    "02-new-row-inactive.json": "examples/new-row-inactive.json",
    "03-polling-checklist.csv": "starter-kit/polling-checklist.csv",
    "README.md": "starter-kit/README.md",
    "LICENSE.txt": "LICENSE.md",
}


def main():
    files = {name: (ROOT / source).read_bytes() for name, source in SOURCES.items()}
    for name in ("01-list-projects-read-only.json", "02-new-row-inactive.json"):
        workflow = json.loads(files[name])
        assert workflow["active"] is False, f"Active workflow: {name}"
        assert not workflow.get("pinData"), f"Pinned data: {name}"
        assert not workflow.get("staticData"), f"Saved polling state: {name}"
        for node in workflow["nodes"]:
            assert not node.get("credentials"), f"Credential reference: {name}"
            assert node["type"] in {
                "n8n-nodes-base.manualTrigger", "n8n-nodes-base.stickyNote",
                "n8n-nodes-appstruct.appStruct", "n8n-nodes-appstruct.appStructTrigger",
            }, f"Unexpected node type: {name}"
            params = node["parameters"]
            assert not params.get("projectId") and not params.get("tableName")
            if node["type"] == "n8n-nodes-appstruct.appStruct":
                assert params == {"resource": "project", "operation": "getMany"}
    manual = json.loads(files["01-list-projects-read-only.json"])
    assert len(manual["nodes"]) == 2
    checks = list(csv.DictReader(io.StringIO(files["03-polling-checklist.csv"].decode())))
    assert len(checks) == 13
    assert all("Not checked" in row.values() for row in checks)
    files["SHA256SUMS.txt"] = "".join(
        f"{hashlib.sha256(data).hexdigest()}  {name}\n"
        for name, data in sorted(files.items())
    ).encode()
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "artifacts" / f"{NAME}.zip"
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(f"{NAME}/{name}", date_time=(2026, 11, 26, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
    print(json.dumps({"archive": str(output), "bytes": output.stat().st_size,
                      "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
                      "files": list(files), "checks": len(checks)}))


if __name__ == "__main__":
    main()
