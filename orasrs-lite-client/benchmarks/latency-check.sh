#!/bin/bash

# OraSRS API Latency Test Script
# Tests the response time of OraSRS API endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test endpoint response time
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    print_info "Testing $description: $endpoint"
    
    local start_time=$(date +%s.%N)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$endpoint")
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l)
    
    if [ "$http_code" = "200" ]; then
        printf "${GREEN}[SUCCESS]${NC} Response time: %.3f seconds\n" $duration
        return 0
    else
        printf "${RED}[ERROR]${NC} HTTP $http_code - Response time: %.3f seconds\n" $duration
        return 1
    fi
}

# Run multiple tests and calculate average
run_latency_tests() {
    local endpoint=$1
    local description=$2
    local iterations=${3:-5}
    
    print_info "Running $iterations iterations for $description..."
    
    local total_time=0
    local success_count=0
    local min_time=9999
    local max_time=0
    
    for i in $(seq 1 $iterations); do
        local start_time=$(date +%s.%N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$endpoint")
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc -l)
        
        if [ "$http_code" = "200" ]; then
            total_time=$(echo "$total_time + $duration" | bc -l)
            success_count=$((success_count + 1))
            
            # Update min/max
            if (( $(echo "$duration < $min_time" | bc -l) )); then
                min_time=$duration
            fi
            if (( $(echo "$duration > $max_time" | bc -l) )); then
                max_time=$duration
            fi
            
            printf "  Iteration %d: %.3f seconds\n" $i $duration
        else
            printf "${RED}[ERROR]${NC} Iteration %d: HTTP $http_code - %.3f seconds\n" $i $duration
        fi
        
        # Wait 1 second between tests
        sleep 1
    done
    
    if [ $success_count -gt 0 ]; then
        local avg_time=$(echo "$total_time / $success_count" | bc -l)
        printf "\n${GREEN}[RESULTS]${NC} $description:\n"
        printf "  Success Rate: %d/%d (%.1f%%)\n" $success_count $iterations $(echo "$success_count * 100 / $iterations" | bc -l)
        printf "  Average Response Time: %.3f seconds (%.1f ms)\n" $avg_time $(echo "$avg_time * 1000" | bc -l)
        printf "  Min Response Time: %.3f seconds (%.1f ms)\n" $min_time $(echo "$min_time * 1000" | bc -l)
        printf "  Max Response Time: %.3f seconds (%.1f ms)\n" $max_time $(echo "$max_time * 1000" | bc -l)
        
        # Check if average response time is under 100ms (0.1 seconds)
        if (( $(echo "$avg_time < 0.1" | bc -l) )); then
            print_success "✅ Average response time is under 100ms - meets performance requirement!"
        else
            print_warning "⚠️  Average response time exceeds 100ms - may not meet performance requirement"
        fi
    else
        print_error "❌ All requests failed for $description"
    fi
}

# Test a specific IP threat query
test_ip_query() {
    local ip=${1:-"8.8.8.8"}
    local endpoint="http://localhost:3006/orasrs/v1/query?ip=$ip"
    
    print_info "Testing IP threat query for $ip..."
    
    local start_time=$(date +%s.%N)
    local response=$(curl -s --connect-timeout 10 --max-time 30 "$endpoint")
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$endpoint")
    
    if [ "$http_code" = "200" ]; then
        printf "${GREEN}[SUCCESS]${NC} IP query for %s took %.3f seconds\n" $ip $duration
        if [ -n "$response" ]; then
            printf "  Response preview: %s\n" "$(echo $response | cut -c1-100)..."
        fi
    else
        printf "${RED}[ERROR]${NC} IP query for %s failed with HTTP %s in %.3f seconds\n" $ip $http_code $duration
        if [ -n "$response" ]; then
            printf "  Response: %s\n" "$response"
        fi
    fi
}

# Main function
main() {
    print_info "Starting OraSRS API Latency Tests..."
    
    # Check if the service is running first
    if ! curl -s http://localhost:3006/health >/dev/null 2>&1; then
        print_error "OraSRS service is not running on port 3006. Please start the service first."
        print_info "Start with: sudo systemctl start orasrs-client"
        exit 1
    fi
    
    print_success "OraSRS service is running on port 3006"
    echo
    
    # Run tests for different endpoints
    run_latency_tests "http://localhost:3006/health" "Health Check Endpoint" 5
    echo
    
    run_latency_tests "http://localhost:3006/orasrs/v1/query?ip=8.8.8.8" "IP Threat Query (8.8.8.8)" 5
    echo
    
    run_latency_tests "http://localhost:3006/orasrs/v1/threats/detected" "Threats Detected Endpoint" 3
    echo
    
    # Test specific IP queries
    print_info "Testing various IP threat queries..."
    test_ip_query "8.8.8.8"
    test_ip_query "1.1.1.1"
    test_ip_query "192.168.1.1"
    test_ip_query "10.0.0.1"
    echo
    
    # Performance summary
    print_success "Latency test completed!"
    print_info "Performance targets:"
    print_info "  - Average response time < 100ms: Essential for local caching"
    print_info "  - 95th percentile response time < 200ms: For high-performance requirements"
    print_info "  - Consistent sub-500ms responses: For real-time threat detection"
}

# Run main function if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
