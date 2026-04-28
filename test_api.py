#!/usr/bin/env python3
"""
Quick test script for ClawSwarm AI API
Usage: python test_api.py
"""

import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"

# Colorized output helpers
class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Color.GREEN}✓{Color.END} {msg}")

def print_error(msg):
    print(f"{Color.RED}✗{Color.END} {msg}")

def print_info(msg):
    print(f"{Color.BLUE}ℹ{Color.END} {msg}")

def print_warn(msg):
    print(f"{Color.YELLOW}⚠{Color.END} {msg}")

# Test tasks
SAMPLE_TASKS = [
    "Write a Python function that implements binary search, explain the algorithm, and include unit tests",
    "Create a REST API endpoint that validates user input, handles errors gracefully, and returns proper HTTP status codes",
    "Explain how transformer neural networks work, provide mathematical intuition, and write a simple attention mechanism implementation",
]

def test_submit_task():
    """Test: Submit a task"""
    print_info("Testing task submission...")
    try:
        payload = {"task": SAMPLE_TASKS[0]}
        response = requests.post(f"{BASE_URL}/task", json=payload, timeout=5)
        
        if response.status_code == 200:
            result = response.json()
            print_success(f"Task submitted: {result['task_id'][:12]}...")
            return result['task_id']
        else:
            print_error(f"HTTP {response.status_code}: {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to backend. Is it running on localhost:8000?")
        return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None

def test_get_task_status(task_id):
    """Test: Get task status"""
    print_info(f"Checking task status: {task_id[:12]}...")
    try:
        response = requests.get(f"{BASE_URL}/task/{task_id}", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print_success(f"Status: {result['status']}")
            if result['status'] == 'completed':
                print_success(f"Result: {str(result['result'])[:100]}...")
            return result
        else:
            print_error(f"HTTP {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None

def test_get_swarm_status():
    """Test: Get swarm status"""
    print_info("Fetching swarm status...")
    try:
        response = requests.get(f"{BASE_URL}/swarm/status", timeout=5)
        if response.status_code == 200:
            result = response.json()
            agents = result.get('agents', [])
            print_success(f"Leader: {result.get('leader_id')}")
            print_success(f"Active agents: {len(agents)}")
            for agent in agents:
                print(f"  - {agent.get('agent_id')}: {agent.get('status')} (skill_vector: {agent.get('skill_vector')})")
            return result
        else:
            print_error(f"HTTP {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None

def test_inject_fault():
    """Test: Fault injection"""
    print_info("Testing fault injection...")
    try:
        # Get swarm status first
        response = requests.get(f"{BASE_URL}/swarm/status", timeout=5)
        if response.status_code != 200:
            print_warn("Cannot get swarm status")
            return False
        
        agents = response.json().get('agents', [])
        if not agents:
            print_warn("No agents available to kill")
            return False
        
        agent_id = agents[0].get('agent_id')
        print_info(f"Injecting fault on {agent_id}...")
        
        payload = {"agent_id": agent_id}
        response = requests.post(f"{BASE_URL}/swarm/inject-fault", json=payload, timeout=5)
        
        if response.status_code == 200:
            print_success(f"Fault injected on {agent_id}")
            print_warn("System recovering (checking in 2 seconds)...")
            time.sleep(2)
            
            # Check new leader
            response = requests.get(f"{BASE_URL}/swarm/status", timeout=5)
            if response.status_code == 200:
                new_leader = response.json().get('leader_id')
                print_success(f"New leader elected: {new_leader}")
                return True
        else:
            print_warn(f"Fault injection failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("ClawSwarm AI - API Test Suite")
    print("="*60 + "\n")
    
    # Check backend connectivity
    print_info("Checking backend connectivity...")
    try:
        requests.get(f"{BASE_URL}/swarm/status", timeout=2)
        print_success("Backend is running!\n")
    except:
        print_error("Backend not responding on http://localhost:8000")
        print("Please start the backend first:")
        print("  docker-compose up")
        print("  or")
        print("  python backend/main.py")
        sys.exit(1)
    
    # Test 1: Get swarm status
    print(f"{Color.BLUE}[TEST 1]{Color.END} Swarm Status")
    print("-" * 40)
    test_get_swarm_status()
    print()
    
    # Test 2: Submit task
    print(f"{Color.BLUE}[TEST 2]{Color.END} Task Submission")
    print("-" * 40)
    task_id = test_submit_task()
    print()
    
    if task_id:
        # Test 3: Poll task progress
        print(f"{Color.BLUE}[TEST 3]{Color.END} Task Progress (20 seconds)")
        print("-" * 40)
        start = time.time()
        while time.time() - start < 20:
            test_get_task_status(task_id)
            status = test_get_task_status(task_id)
            if status and status.get('status') in ['completed', 'failed']:
                break
            time.sleep(5)
        print()
    
    # Test 4: Fault injection
    print(f"{Color.BLUE}[TEST 4]{Color.END} Fault Tolerance")
    print("-" * 40)
    test_inject_fault()
    print()
    
    # Test 5: Multi-task submission
    print(f"{Color.BLUE}[TEST 5]{Color.END} Multi-task Submission")
    print("-" * 40)
    print_info("Submitting multiple tasks simultaneously...")
    task_ids = []
    for i, task in enumerate(SAMPLE_TASKS[1:], 1):
        payload = {"task": task}
        try:
            response = requests.post(f"{BASE_URL}/task", json=payload, timeout=5)
            if response.status_code == 200:
                tid = response.json()['task_id']
                task_ids.append(tid)
                print_success(f"Task {i} submitted: {tid[:12]}...")
        except Exception as e:
            print_error(f"Task {i} failed: {e}")
    
    if task_ids:
        print_info("Checking all tasks...")
        time.sleep(5)
        for tid in task_ids:
            test_get_task_status(tid)
    
    print()
    print("="*60)
    print("Test suite complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
