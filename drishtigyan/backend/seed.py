import os
import sys

# Allow running from backend/ or project root
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from seed import seed_db  # noqa: E402


if __name__ == "__main__":
    seed_db()
