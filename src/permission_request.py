"""
Permission request management for the SASB air-quality project.

This module handles permission requests for accessing external data sources
such as the World Bank API and OpenAQ datasets. It provides functionality to:
- Create and track permission requests
- Grant or deny permissions
- Check permission status
- Log permission activities
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
LOGGER = logging.getLogger(__name__)


class PermissionStatus(Enum):
    """Status of a permission request."""
    PENDING = "pending"
    GRANTED = "granted"
    DENIED = "denied"
    REVOKED = "revoked"


class DataSource(Enum):
    """Supported data sources requiring permission."""
    WORLD_BANK_API = "world_bank_api"
    OPENAQ_KAGGLE = "openaq_kaggle"
    CUSTOM = "custom"


@dataclass
class PermissionRequest:
    """Represents a permission request for data source access."""
    request_id: str
    requester: str
    data_source: DataSource
    purpose: str
    status: PermissionStatus = PermissionStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    granted_by: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data["data_source"] = self.data_source.value
        data["status"] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: Dict) -> "PermissionRequest":
        """Create from dictionary."""
        data["data_source"] = DataSource(data["data_source"])
        data["status"] = PermissionStatus(data["status"])
        return cls(**data)


class PermissionManager:
    """Manages permission requests for data source access."""

    def __init__(self, storage_path: Optional[Path] = None):
        """
        Initialize the permission manager.

        Args:
            storage_path: Path to store permission records. Defaults to
                         project_root/data/permissions.json
        """
        if storage_path is None:
            project_root = Path(__file__).resolve().parents[1]
            storage_path = project_root / "data" / "permissions.json"
        self.storage_path = Path(storage_path)
        self._requests: Dict[str, PermissionRequest] = {}
        self._load()

    def _load(self) -> None:
        """Load permission requests from storage."""
        if self.storage_path.exists():
            try:
                data = json.loads(self.storage_path.read_text())
                self._requests = {
                    k: PermissionRequest.from_dict(v) for k, v in data.items()
                }
                LOGGER.info("Loaded %d permission requests from %s", len(self._requests), self.storage_path)
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                LOGGER.warning("Failed to load permissions: %s", e)
                self._requests = {}

    def _save(self) -> None:
        """Save permission requests to storage."""
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        data = {k: v.to_dict() for k, v in self._requests.items()}
        self.storage_path.write_text(json.dumps(data, indent=2))
        LOGGER.info("Saved %d permission requests to %s", len(self._requests), self.storage_path)

    def _generate_request_id(self) -> str:
        """Generate a unique request ID."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        count = len(self._requests) + 1
        return f"PR-{timestamp}-{count:04d}"

    def create_request(
        self,
        requester: str,
        data_source: DataSource,
        purpose: str,
        notes: Optional[str] = None,
    ) -> PermissionRequest:
        """
        Create a new permission request.

        Args:
            requester: Name or ID of the person requesting permission.
            data_source: The data source being requested.
            purpose: Description of intended use.
            notes: Additional notes.

        Returns:
            The created permission request.
        """
        request_id = self._generate_request_id()
        request = PermissionRequest(
            request_id=request_id,
            requester=requester,
            data_source=data_source,
            purpose=purpose,
            notes=notes,
        )
        self._requests[request_id] = request
        self._save()
        LOGGER.info("Created permission request %s for %s by %s", request_id, data_source.value, requester)
        return request

    def grant_permission(
        self,
        request_id: str,
        granted_by: str,
        notes: Optional[str] = None,
    ) -> PermissionRequest:
        """
        Grant a pending permission request.

        Args:
            request_id: ID of the request to grant.
            granted_by: Name or ID of the person granting permission.
            notes: Additional notes.

        Returns:
            The updated permission request.

        Raises:
            KeyError: If request_id is not found.
            ValueError: If request is not in pending status.
        """
        if request_id not in self._requests:
            raise KeyError(f"Permission request {request_id} not found")

        request = self._requests[request_id]
        if request.status != PermissionStatus.PENDING:
            raise ValueError(f"Cannot grant request {request_id} - status is {request.status.value}")

        request.status = PermissionStatus.GRANTED
        request.granted_by = granted_by
        request.updated_at = datetime.now(timezone.utc).isoformat()
        if notes:
            request.notes = notes
        self._save()
        LOGGER.info("Permission request %s granted by %s", request_id, granted_by)
        return request

    def deny_permission(
        self,
        request_id: str,
        denied_by: str,
        notes: Optional[str] = None,
    ) -> PermissionRequest:
        """
        Deny a pending permission request.

        Args:
            request_id: ID of the request to deny.
            denied_by: Name or ID of the person denying permission.
            notes: Reason for denial.

        Returns:
            The updated permission request.

        Raises:
            KeyError: If request_id is not found.
            ValueError: If request is not in pending status.
        """
        if request_id not in self._requests:
            raise KeyError(f"Permission request {request_id} not found")

        request = self._requests[request_id]
        if request.status != PermissionStatus.PENDING:
            raise ValueError(f"Cannot deny request {request_id} - status is {request.status.value}")

        request.status = PermissionStatus.DENIED
        request.granted_by = denied_by  # Store who denied
        request.updated_at = datetime.now(timezone.utc).isoformat()
        if notes:
            request.notes = notes
        self._save()
        LOGGER.info("Permission request %s denied by %s", request_id, denied_by)
        return request

    def revoke_permission(
        self,
        request_id: str,
        revoked_by: str,
        notes: Optional[str] = None,
    ) -> PermissionRequest:
        """
        Revoke a previously granted permission.

        Args:
            request_id: ID of the request to revoke.
            revoked_by: Name or ID of the person revoking permission.
            notes: Reason for revocation.

        Returns:
            The updated permission request.

        Raises:
            KeyError: If request_id is not found.
            ValueError: If request is not in granted status.
        """
        if request_id not in self._requests:
            raise KeyError(f"Permission request {request_id} not found")

        request = self._requests[request_id]
        if request.status != PermissionStatus.GRANTED:
            raise ValueError(f"Cannot revoke request {request_id} - status is {request.status.value}")

        request.status = PermissionStatus.REVOKED
        request.granted_by = revoked_by  # Store who revoked
        request.updated_at = datetime.now(timezone.utc).isoformat()
        if notes:
            request.notes = notes
        self._save()
        LOGGER.info("Permission request %s revoked by %s", request_id, revoked_by)
        return request

    def get_request(self, request_id: str) -> Optional[PermissionRequest]:
        """Get a specific permission request by ID."""
        return self._requests.get(request_id)

    def list_requests(
        self,
        status: Optional[PermissionStatus] = None,
        data_source: Optional[DataSource] = None,
        requester: Optional[str] = None,
    ) -> List[PermissionRequest]:
        """
        List permission requests with optional filtering.

        Args:
            status: Filter by status.
            data_source: Filter by data source.
            requester: Filter by requester.

        Returns:
            List of matching permission requests.
        """
        results = list(self._requests.values())

        if status is not None:
            results = [r for r in results if r.status == status]
        if data_source is not None:
            results = [r for r in results if r.data_source == data_source]
        if requester is not None:
            results = [r for r in results if r.requester == requester]

        return results

    def has_permission(self, requester: str, data_source: DataSource) -> bool:
        """
        Check if a requester has granted permission for a data source.

        Args:
            requester: Name or ID of the requester.
            data_source: The data source to check.

        Returns:
            True if the requester has an active granted permission.
        """
        for request in self._requests.values():
            if (
                request.requester == requester
                and request.data_source == data_source
                and request.status == PermissionStatus.GRANTED
            ):
                return True
        return False

    def clear_all(self) -> None:
        """Clear all permission requests (for testing purposes)."""
        self._requests = {}
        if self.storage_path.exists():
            self.storage_path.unlink()
        LOGGER.info("Cleared all permission requests")


def main() -> None:
    """Demo usage of the permission request system."""
    manager = PermissionManager()

    # Example: Create a permission request
    request = manager.create_request(
        requester="Yash Lunawat",
        data_source=DataSource.WORLD_BANK_API,
        purpose="Download PM2.5 exposure indicators for 2004-2023 analysis",
        notes="Required for country-level air quality panel"
    )
    print(f"Created request: {request.request_id}")

    # Example: Grant the permission
    manager.grant_permission(
        request_id=request.request_id,
        granted_by="Project Lead",
        notes="Approved for academic research purposes"
    )
    print(f"Request {request.request_id} has been granted")

    # Example: Check permission
    has_access = manager.has_permission("Yash Lunawat", DataSource.WORLD_BANK_API)
    print(f"Yash Lunawat has World Bank API access: {has_access}")

    # List all requests
    print("\nAll permission requests:")
    for req in manager.list_requests():
        print(f"  {req.request_id}: {req.data_source.value} - {req.status.value}")


if __name__ == "__main__":
    main()
