#!/bin/bash

# Test Runner Script for dchat.pro Backend
# Runs all unit tests and generates coverage report
#
# Usage:
#   ./run_tests.sh                 # Run all tests
#   ./run_tests.sh test_user_profile  # Run specific test
#
# @author Manus AI
# @date 2025-11-05

set -e

echo "🧪 Running dchat.pro Backend Tests"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to backend directory
cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check if pytest is installed
if ! python3 -m pytest --version &> /dev/null; then
    echo "📦 Installing pytest..."
    pip3 install pytest pytest-cov
fi

echo "📋 Test Configuration:"
echo "   Python: $(python3 --version)"
echo "   Working Directory: $(pwd)"
echo ""

# Run tests
if [ -z "$1" ]; then
    echo "🏃 Running all tests..."
    python3 -m pytest tests/ -v --tb=short
else
    echo "🏃 Running test: $1"
    python3 -m pytest tests/$1.py -v --tb=short
fi

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
