"""Tests for the permission request module."""

import json
import tempfile
from pathlib import Path

import pytest

from src.permission_request import (
    DataSource,
    PermissionManager,
    PermissionRequest,
    PermissionStatus,
)


@pytest.fixture
def temp_storage():
    """Create a temporary storage file for tests."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        temp_path = Path(f.name)
    yield temp_path
    if temp_path.exists():
        temp_path.unlink()


@pytest.fixture
def manager(temp_storage):
    """Create a permission manager with temporary storage."""
    return PermissionManager(storage_path=temp_storage)


class TestPermissionRequest:
    """Tests for the PermissionRequest dataclass."""

    def test_create_request(self):
        """Test creating a permission request."""
        request = PermissionRequest(
            request_id="PR-001",
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        assert request.request_id == "PR-001"
        assert request.requester == "Test User"
        assert request.data_source == DataSource.WORLD_BANK_API
        assert request.purpose == "Test purpose"
        assert request.status == PermissionStatus.PENDING

    def test_to_dict(self):
        """Test converting request to dictionary."""
        request = PermissionRequest(
            request_id="PR-001",
            requester="Test User",
            data_source=DataSource.OPENAQ_KAGGLE,
            purpose="Test purpose",
        )
        data = request.to_dict()
        assert data["request_id"] == "PR-001"
        assert data["data_source"] == "openaq_kaggle"
        assert data["status"] == "pending"

    def test_from_dict(self):
        """Test creating request from dictionary."""
        data = {
            "request_id": "PR-001",
            "requester": "Test User",
            "data_source": "world_bank_api",
            "purpose": "Test purpose",
            "status": "granted",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-02T00:00:00",
            "granted_by": "Admin",
            "notes": None,
        }
        request = PermissionRequest.from_dict(data)
        assert request.request_id == "PR-001"
        assert request.data_source == DataSource.WORLD_BANK_API
        assert request.status == PermissionStatus.GRANTED


class TestPermissionManager:
    """Tests for the PermissionManager class."""

    def test_create_request(self, manager):
        """Test creating a permission request through the manager."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Download air quality data",
        )
        assert request.request_id.startswith("PR-")
        assert request.requester == "Test User"
        assert request.status == PermissionStatus.PENDING

    def test_grant_permission(self, manager):
        """Test granting a permission request."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Download air quality data",
        )
        granted = manager.grant_permission(
            request_id=request.request_id,
            granted_by="Admin",
            notes="Approved",
        )
        assert granted.status == PermissionStatus.GRANTED
        assert granted.granted_by == "Admin"

    def test_deny_permission(self, manager):
        """Test denying a permission request."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.OPENAQ_KAGGLE,
            purpose="Test purpose",
        )
        denied = manager.deny_permission(
            request_id=request.request_id,
            denied_by="Admin",
            notes="Not approved",
        )
        assert denied.status == PermissionStatus.DENIED
        assert denied.granted_by == "Admin"  # Stores who denied

    def test_revoke_permission(self, manager):
        """Test revoking a granted permission."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        manager.grant_permission(request.request_id, "Admin")
        revoked = manager.revoke_permission(
            request_id=request.request_id,
            revoked_by="SecurityTeam",
            notes="Access no longer needed",
        )
        assert revoked.status == PermissionStatus.REVOKED
        assert revoked.granted_by == "SecurityTeam"  # Stores who revoked

    def test_grant_non_pending_raises_error(self, manager):
        """Test that granting a non-pending request raises an error."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        manager.grant_permission(request.request_id, "Admin")
        with pytest.raises(ValueError):
            manager.grant_permission(request.request_id, "Admin")

    def test_deny_non_pending_raises_error(self, manager):
        """Test that denying a non-pending request raises an error."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        manager.grant_permission(request.request_id, "Admin")
        with pytest.raises(ValueError):
            manager.deny_permission(request.request_id, "Admin")

    def test_revoke_non_granted_raises_error(self, manager):
        """Test that revoking a non-granted request raises an error."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        with pytest.raises(ValueError):
            manager.revoke_permission(request.request_id, "Admin")

    def test_get_request(self, manager):
        """Test retrieving a specific request."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        retrieved = manager.get_request(request.request_id)
        assert retrieved is not None
        assert retrieved.request_id == request.request_id

    def test_get_nonexistent_request(self, manager):
        """Test retrieving a nonexistent request returns None."""
        result = manager.get_request("nonexistent-id")
        assert result is None

    def test_list_requests(self, manager):
        """Test listing all requests."""
        manager.create_request("User1", DataSource.WORLD_BANK_API, "Purpose 1")
        manager.create_request("User2", DataSource.OPENAQ_KAGGLE, "Purpose 2")
        requests = manager.list_requests()
        assert len(requests) == 2

    def test_list_requests_filter_by_status(self, manager):
        """Test filtering requests by status."""
        req1 = manager.create_request("User1", DataSource.WORLD_BANK_API, "Purpose 1")
        manager.create_request("User2", DataSource.OPENAQ_KAGGLE, "Purpose 2")
        manager.grant_permission(req1.request_id, "Admin")

        pending = manager.list_requests(status=PermissionStatus.PENDING)
        granted = manager.list_requests(status=PermissionStatus.GRANTED)
        assert len(pending) == 1
        assert len(granted) == 1

    def test_list_requests_filter_by_data_source(self, manager):
        """Test filtering requests by data source."""
        manager.create_request("User1", DataSource.WORLD_BANK_API, "Purpose 1")
        manager.create_request("User2", DataSource.OPENAQ_KAGGLE, "Purpose 2")

        world_bank = manager.list_requests(data_source=DataSource.WORLD_BANK_API)
        openaq = manager.list_requests(data_source=DataSource.OPENAQ_KAGGLE)
        assert len(world_bank) == 1
        assert len(openaq) == 1

    def test_list_requests_filter_by_requester(self, manager):
        """Test filtering requests by requester."""
        manager.create_request("User1", DataSource.WORLD_BANK_API, "Purpose 1")
        manager.create_request("User2", DataSource.OPENAQ_KAGGLE, "Purpose 2")

        user1_requests = manager.list_requests(requester="User1")
        assert len(user1_requests) == 1
        assert user1_requests[0].requester == "User1"

    def test_has_permission_granted(self, manager):
        """Test checking permission when granted."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        manager.grant_permission(request.request_id, "Admin")
        assert manager.has_permission("Test User", DataSource.WORLD_BANK_API)

    def test_has_permission_not_granted(self, manager):
        """Test checking permission when not granted."""
        manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        assert not manager.has_permission("Test User", DataSource.WORLD_BANK_API)

    def test_has_permission_revoked(self, manager):
        """Test checking permission when revoked."""
        request = manager.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        manager.grant_permission(request.request_id, "Admin")
        manager.revoke_permission(request.request_id, "Admin")
        assert not manager.has_permission("Test User", DataSource.WORLD_BANK_API)

    def test_persistence(self, temp_storage):
        """Test that requests persist across manager instances."""
        manager1 = PermissionManager(storage_path=temp_storage)
        request = manager1.create_request(
            requester="Test User",
            data_source=DataSource.WORLD_BANK_API,
            purpose="Test purpose",
        )
        manager1.grant_permission(request.request_id, "Admin")

        # Create new manager instance - should load from storage
        manager2 = PermissionManager(storage_path=temp_storage)
        requests = manager2.list_requests()
        assert len(requests) == 1
        assert requests[0].status == PermissionStatus.GRANTED

    def test_clear_all(self, manager, temp_storage):
        """Test clearing all requests."""
        manager.create_request("User1", DataSource.WORLD_BANK_API, "Purpose 1")
        manager.create_request("User2", DataSource.OPENAQ_KAGGLE, "Purpose 2")
        assert len(manager.list_requests()) == 2

        manager.clear_all()
        assert len(manager.list_requests()) == 0
        assert not temp_storage.exists()

    def test_nonexistent_request_raises_key_error(self, manager):
        """Test that operations on nonexistent requests raise KeyError."""
        with pytest.raises(KeyError):
            manager.grant_permission("nonexistent-id", "Admin")
        with pytest.raises(KeyError):
            manager.deny_permission("nonexistent-id", "Admin")
        with pytest.raises(KeyError):
            manager.revoke_permission("nonexistent-id", "Admin")
