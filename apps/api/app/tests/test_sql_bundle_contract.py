from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
APPLY_ORDER = ROOT / "database" / "APPLY_ORDER.md"
BUNDLE_SCRIPT = ROOT / "scripts" / "bundle-sql.sh"
RELEASE_CHECKLIST = ROOT / "docs" / "release-checklist.md"


def test_release_readiness_assets_exist() -> None:
    assert APPLY_ORDER.is_file()
    assert BUNDLE_SCRIPT.is_file()
    assert RELEASE_CHECKLIST.is_file()
    assert "Merge train" in RELEASE_CHECKLIST.read_text(encoding="utf-8")


def test_apply_order_paths_exist_on_disk() -> None:
    text = APPLY_ORDER.read_text(encoding="utf-8")
    rel_paths = []
    for line in text.splitlines():
        line = line.strip()
        if line[:1].isdigit() and ". `" in line:
            rel = line.split("`", 2)[1]
            rel_paths.append(rel)

    assert len(rel_paths) >= 20
    for rel in rel_paths:
        path = ROOT / "database" / rel
        assert path.is_file(), f"missing {rel}"
