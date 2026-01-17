"""
Locust Load Testing Script for dchat.pro

This script simulates realistic user behavior for load testing the dchat.pro API.

Usage:
    # Install Locust
    pip install locust

    # Run with web UI
    locust -f locustfile.py --host=https://api.dchat.pro

    # Run headless
    locust -f locustfile.py --host=https://api.dchat.pro \
        --users 1000 --spawn-rate 10 --run-time 5m --headless

Author: Manus AI
Date: 2024-11-05
"""

from locust import HttpUser, task, between, events
import json
import random
import time
from datetime import datetime


class DchatUser(HttpUser):
    """
    Simulates a dchat.pro user with realistic behavior patterns.
    """
    
    # Wait between 1-3 seconds between tasks (realistic user behavior)
    wait_time = between(1, 3)
    
    # Test data
    test_addresses = [
        f"0x{''.join(random.choices('0123456789abcdef', k=40))}"
        for _ in range(100)
    ]
    
    def on_start(self):
        """
        Called when a simulated user starts.
        Performs authentication and setup.
        """
        # Select a random test address
        self.address = random.choice(self.test_addresses)
        self.token = None
        
        # Authenticate
        self.authenticate()
    
    def authenticate(self):
        """
        Authenticate user and get JWT token.
        """
        # Request nonce
        with self.client.post(
            "/api/auth/nonce",
            json={"address": self.address},
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                nonce = data.get('nonce')
                
                if nonce:
                    # In real scenario, sign the nonce with private key
                    # For testing, we'll use a mock signature
                    signature = f"0x{''.join(random.choices('0123456789abcdef', k=130))}"
                    
                    # Verify signature and get token
                    with self.client.post(
                        "/api/auth/verify-signature",
                        json={
                            "address": self.address,
                            "signature": signature,
                            "nonce": nonce
                        },
                        catch_response=True
                    ) as auth_response:
                        if auth_response.status_code == 200:
                            auth_data = auth_response.json()
                            self.token = auth_data.get('token')
                            auth_response.success()
                        else:
                            auth_response.failure(f"Authentication failed: {auth_response.text}")
                else:
                    response.failure("No nonce in response")
            else:
                response.failure(f"Nonce request failed: {response.text}")
    
    def get_headers(self):
        """
        Get request headers with authentication token.
        """
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(5)
    def get_messages(self):
        """
        Get messages (most common operation - 50% of traffic).
        """
        with self.client.get(
            "/api/messages",
            headers=self.get_headers(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                # Token expired, re-authenticate
                self.authenticate()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Failed: {response.status_code}")
    
    @task(2)
    def send_message(self):
        """
        Send a message (20% of traffic).
        """
        recipient = random.choice(self.test_addresses)
        
        with self.client.post(
            "/api/messages",
            json={
                "recipient": recipient,
                "content": f"Test message at {datetime.now().isoformat()}",
                "encrypted": True
            },
            headers=self.get_headers(),
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            elif response.status_code == 401:
                self.authenticate()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Failed: {response.status_code}")
    
    @task(1)
    def get_groups(self):
        """
        Get user's groups (10% of traffic).
        """
        with self.client.get(
            f"/api/groups/user/{self.address}",
            headers=self.get_headers(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                self.authenticate()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Failed: {response.status_code}")
    
    @task(1)
    def get_user_profile(self):
        """
        Get user profile (10% of traffic).
        """
        with self.client.get(
            f"/api/users/{self.address}",
            headers=self.get_headers(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                self.authenticate()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Failed: {response.status_code}")
    
    @task(1)
    def create_group(self):
        """
        Create a group (10% of traffic).
        """
        group_name = f"Test Group {random.randint(1000, 9999)}"
        
        with self.client.post(
            "/api/web3/groups/create",
            json={
                "name": group_name,
                "description": "Test group for load testing",
                "is_public": True
            },
            headers=self.get_headers(),
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            elif response.status_code == 401:
                self.authenticate()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Failed: {response.status_code}")


class WebSocketUser(HttpUser):
    """
    Simulates WebSocket connections for real-time messaging.
    """
    
    wait_time = between(5, 15)
    
    def on_start(self):
        """Setup WebSocket connection."""
        # Note: Locust doesn't natively support WebSocket
        # For WebSocket testing, use a dedicated tool like:
        # - Artillery (https://artillery.io/)
        # - k6 with xk6-websockets
        # - Custom Python script with websocket-client
        pass
    
    @task
    def simulate_websocket_activity(self):
        """
        Simulate WebSocket activity by polling for new messages.
        In production, this would be a persistent WebSocket connection.
        """
        # Simulate polling for new messages
        self.client.get("/api/messages/unread")


# Event listeners for custom metrics

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Called when the load test starts.
    """
    print("Load test starting...")
    print(f"Target host: {environment.host}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """
    Called when the load test stops.
    Print summary statistics.
    """
    print("\n" + "="*50)
    print("Load Test Summary")
    print("="*50)
    
    stats = environment.stats
    
    print(f"\nTotal Requests: {stats.total.num_requests}")
    print(f"Total Failures: {stats.total.num_failures}")
    print(f"Failure Rate: {stats.total.fail_ratio * 100:.2f}%")
    print(f"\nResponse Times:")
    print(f"  Median: {stats.total.median_response_time}ms")
    print(f"  95th percentile: {stats.total.get_response_time_percentile(0.95)}ms")
    print(f"  99th percentile: {stats.total.get_response_time_percentile(0.99)}ms")
    print(f"  Average: {stats.total.avg_response_time:.2f}ms")
    print(f"  Min: {stats.total.min_response_time}ms")
    print(f"  Max: {stats.total.max_response_time}ms")
    print(f"\nRequests per Second: {stats.total.total_rps:.2f}")
    
    print("\n" + "="*50)


# Custom load shapes for different testing scenarios

from locust import LoadTestShape

class StepLoadShape(LoadTestShape):
    """
    Step load shape: Gradually increase load in steps.
    
    Useful for finding the breaking point of the system.
    """
    
    step_time = 60  # seconds
    step_load = 50  # users
    spawn_rate = 10
    time_limit = 600  # 10 minutes
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time > self.time_limit:
            return None
        
        current_step = run_time // self.step_time
        return (current_step * self.step_load, self.spawn_rate)


class SpikeLoadShape(LoadTestShape):
    """
    Spike load shape: Sudden spike in traffic.
    
    Useful for testing auto-scaling and handling sudden traffic increases.
    """
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time < 60:
            return (100, 10)  # Normal load
        elif run_time < 120:
            return (1000, 50)  # Spike!
        elif run_time < 180:
            return (100, 10)  # Back to normal
        else:
            return None  # End test


# To use a custom load shape, run:
# locust -f locustfile.py --host=https://api.dchat.pro --shape=StepLoadShape
