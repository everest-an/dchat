"""
Stress Testing Script
Test system performance under load
"""

import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict
import json


class StressTest:
    """
    Stress test runner for Dchat API
    """
    
    def __init__(self, base_url: str = 'http://localhost:5000'):
        self.base_url = base_url
        self.results = {
            'requests_sent': 0,
            'requests_successful': 0,
            'requests_failed': 0,
            'response_times': [],
            'errors': []
        }
    
    async def make_request(
        self,
        session: aiohttp.ClientSession,
        method: str,
        endpoint: str,
        data: Dict = None
    ) -> Dict:
        """Make a single HTTP request"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            async with session.request(method, url, json=data) as response:
                response_time = (time.time() - start_time) * 1000
                
                self.results['requests_sent'] += 1
                self.results['response_times'].append(response_time)
                
                if response.status < 400:
                    self.results['requests_successful'] += 1
                else:
                    self.results['requests_failed'] += 1
                    self.results['errors'].append({
                        'endpoint': endpoint,
                        'status': response.status,
                        'response_time': response_time
                    })
                
                return {
                    'status': response.status,
                    'response_time': response_time
                }
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.results['requests_sent'] += 1
            self.results['requests_failed'] += 1
            self.results['response_times'].append(response_time)
            self.results['errors'].append({
                'endpoint': endpoint,
                'error': str(e),
                'response_time': response_time
            })
            
            return {
                'status': 0,
                'error': str(e),
                'response_time': response_time
            }
    
    async def run_concurrent_requests(
        self,
        num_requests: int,
        endpoint: str,
        method: str = 'GET',
        data: Dict = None
    ):
        """Run multiple concurrent requests"""
        async with aiohttp.ClientSession() as session:
            tasks = [
                self.make_request(session, method, endpoint, data)
                for _ in range(num_requests)
            ]
            
            await asyncio.gather(*tasks)
    
    def calculate_statistics(self) -> Dict:
        """Calculate performance statistics"""
        if not self.results['response_times']:
            return {}
        
        response_times = self.results['response_times']
        
        return {
            'total_requests': self.results['requests_sent'],
            'successful_requests': self.results['requests_successful'],
            'failed_requests': self.results['requests_failed'],
            'success_rate': (self.results['requests_successful'] / self.results['requests_sent'] * 100) if self.results['requests_sent'] > 0 else 0,
            'response_time_stats': {
                'min_ms': min(response_times),
                'max_ms': max(response_times),
                'mean_ms': statistics.mean(response_times),
                'median_ms': statistics.median(response_times),
                'p95_ms': statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times),
                'p99_ms': statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times)
            },
            'errors': self.results['errors'][:10]  # First 10 errors
        }
    
    def print_results(self):
        """Print test results"""
        stats = self.calculate_statistics()
        
        print("\n" + "="*70)
        print("🔥 STRESS TEST RESULTS")
        print("="*70)
        
        print(f"\n📊 Request Statistics:")
        print(f"   Total Requests:      {stats['total_requests']}")
        print(f"   Successful:          {stats['successful_requests']} ({stats['success_rate']:.1f}%)")
        print(f"   Failed:              {stats['failed_requests']}")
        
        rt_stats = stats['response_time_stats']
        print(f"\n⏱️  Response Time Statistics:")
        print(f"   Min:                 {rt_stats['min_ms']:.2f} ms")
        print(f"   Max:                 {rt_stats['max_ms']:.2f} ms")
        print(f"   Mean:                {rt_stats['mean_ms']:.2f} ms")
        print(f"   Median:              {rt_stats['median_ms']:.2f} ms")
        print(f"   95th Percentile:     {rt_stats['p95_ms']:.2f} ms")
        print(f"   99th Percentile:     {rt_stats['p99_ms']:.2f} ms")
        
        # Performance assessment
        print(f"\n🎯 Performance Assessment:")
        if rt_stats['p95_ms'] < 200:
            print("   ✅ EXCELLENT - P95 < 200ms")
        elif rt_stats['p95_ms'] < 500:
            print("   ✅ GOOD - P95 < 500ms")
        elif rt_stats['p95_ms'] < 1000:
            print("   ⚠️  ACCEPTABLE - P95 < 1000ms")
        else:
            print("   ❌ POOR - P95 > 1000ms (needs optimization)")
        
        if stats['success_rate'] >= 99:
            print("   ✅ EXCELLENT - Success rate >= 99%")
        elif stats['success_rate'] >= 95:
            print("   ✅ GOOD - Success rate >= 95%")
        elif stats['success_rate'] >= 90:
            print("   ⚠️  ACCEPTABLE - Success rate >= 90%")
        else:
            print("   ❌ POOR - Success rate < 90% (needs investigation)")
        
        if stats['errors']:
            print(f"\n❌ Sample Errors (first 10):")
            for i, error in enumerate(stats['errors'][:10], 1):
                print(f"   {i}. {error}")
        
        print("\n" + "="*70)


async def main():
    """Run stress tests"""
    print("\n🚀 Starting Stress Tests...")
    print("="*70)
    
    # Test 1: Health check endpoint
    print("\n📝 Test 1: Health Check Endpoint (100 concurrent requests)")
    test1 = StressTest()
    start_time = time.time()
    await test1.run_concurrent_requests(100, '/health')
    duration = time.time() - start_time
    print(f"   Duration: {duration:.2f}s")
    print(f"   Throughput: {100/duration:.1f} req/s")
    test1.print_results()
    
    # Test 2: Metrics endpoint
    print("\n📝 Test 2: Metrics Endpoint (50 concurrent requests)")
    test2 = StressTest()
    start_time = time.time()
    await test2.run_concurrent_requests(50, '/metrics')
    duration = time.time() - start_time
    print(f"   Duration: {duration:.2f}s")
    print(f"   Throughput: {50/duration:.1f} req/s")
    test2.print_results()
    
    # Test 3: Sustained load
    print("\n📝 Test 3: Sustained Load (500 requests over 10 batches)")
    test3 = StressTest()
    start_time = time.time()
    for i in range(10):
        await test3.run_concurrent_requests(50, '/health')
        print(f"   Batch {i+1}/10 completed")
    duration = time.time() - start_time
    print(f"   Total Duration: {duration:.2f}s")
    print(f"   Average Throughput: {500/duration:.1f} req/s")
    test3.print_results()
    
    print("\n✅ All stress tests completed!")


if __name__ == '__main__':
    asyncio.run(main())
