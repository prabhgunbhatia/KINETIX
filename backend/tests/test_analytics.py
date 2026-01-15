"""
Tests for analytics service functions (TRIMP, ACWR, etc.)
"""
import pytest
from datetime import datetime, timedelta, timezone
from app.analytics_service import calculate_trimp, calculate_acwr
from app.models import Activity, User
from app.database import SessionLocal, Base, engine
import uuid


@pytest.fixture
def db():
    """Create a test database session"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password="test_hash"
    )
    db.add(user)
    db.commit()
    return user


class TestTRIMP:
    """Test TRIMP calculation"""
    
    def test_trimp_basic(self):
        """Test basic TRIMP calculation"""
        # 30 min run at 70% max HR (140 bpm with 200 max, 60 rest)
        hr_reserve = (140 - 60) / (200 - 60)  # 0.571
        expected = 30 * hr_reserve * (2.718 ** (1.92 * hr_reserve))
        
        result = calculate_trimp(140, 30, max_hr=200, rest_hr=60)
        
        assert result > 0
        assert abs(result - expected) < 1.0  # Allow small floating point differences
    
    def test_trimp_zero_duration(self):
        """Test TRIMP with zero duration returns 0"""
        result = calculate_trimp(140, 0)
        assert result == 0.0
    
    def test_trimp_none_heart_rate(self):
        """Test TRIMP with None heart rate returns 0"""
        result = calculate_trimp(None, 30)
        assert result == 0.0
    
    def test_trimp_high_intensity(self):
        """Test that high intensity produces exponentially higher TRIMP"""
        easy = calculate_trimp(140, 30, max_hr=200, rest_hr=60)
        hard = calculate_trimp(170, 30, max_hr=200, rest_hr=60)
        
        # Hard should be significantly more than easy
        assert hard > easy * 1.5


class TestACWR:
    """Test ACWR calculation"""
    
    def test_acwr_no_activities(self, db, test_user):
        """Test ACWR with no activities returns zero"""
        result = calculate_acwr(db, str(test_user.id))
        
        assert result["acute_load"] == 0.0
        assert result["chronic_load"] == 0.0
        assert result["acwr_ratio"] == 0.0
        assert result["injury_risk"] == "No Data"
    
    def test_acwr_with_activities(self, db, test_user):
        """Test ACWR calculation with sample activities"""
        # Create activities over the past 28 days
        base_date = datetime.now(timezone.utc)
        
        # Add activities with TRIMP scores
        for i in range(20):
            activity_date = base_date - timedelta(days=i)
            activity = Activity(
                id=uuid.uuid4(),
                user_id=test_user.id,
                timestamp=activity_date,
                distance=5000,  # 5km
                moving_time=1800,  # 30 min
                heart_rate=150.0,
                trimp_score=50.0,  # Fixed TRIMP for simplicity
                source="test"
            )
            db.add(activity)
        
        db.commit()
        
        result = calculate_acwr(db, str(test_user.id))
        
        assert result["acute_load"] > 0
        assert result["chronic_load"] > 0
        assert result["acwr_ratio"] > 0
        assert result["injury_risk"] in ["Under-training", "Optimal", "Increased Risk", "High Risk", "No Data"]

