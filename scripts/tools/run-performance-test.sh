#!/bin/bash

# OraSRS Protocol Performance Test Script
# This script runs the performance test for OraSRS client

echo "🚀 Starting OraSRS Protocol Performance Test..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js before running this test."
    exit 1
fi

# Check if required files exist
if [ ! -f "test-ip-performance-advanced.js" ]; then
    echo "❌ Test script 'test-ip-performance-advanced.js' not found!"
    exit 1
fi

# Run the performance test
echo "📊 Running IP performance test..."
node test-ip-performance-advanced.js

# Check the exit status
if [ $? -eq 0 ]; then
    echo "✅ Performance test completed successfully!"
    echo "📈 Test results saved to oraSRS-client-performance-report.json"
    echo "📋 Test IP list saved to test-ip-list.json"
else
    echo "❌ Performance test failed!"
    exit 1
fi

echo "🏁 Test execution completed."