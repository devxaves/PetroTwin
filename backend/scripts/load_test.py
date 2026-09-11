import asyncio
import time

import httpx
import numpy as np

ENDPOINTS = [
    ("wells", "GET", "/wells", None),
    ("diagnostics", "GET", "/wells/WELL-001/diagnostics/latest", None),
    (
        "whatif",
        "POST",
        "/wells/WELL-001/whatif",
        {"steam_volume": 2500, "spm": 7.0},
    ),
]

CONCURRENT_USERS = 20
REQUESTS_PER_USER = 5
BASE_URL = "http://localhost:8000"


async def make_request(client: httpx.AsyncClient, method: str, path: str, json_data: dict | None):
    start = time.perf_counter()
    try:
        if method == "GET":
            resp = await client.get(f"{BASE_URL}{path}")
        else:
            resp = await client.post(f"{BASE_URL}{path}", json=json_data)
        elapsed = (time.perf_counter() - start) * 1000.0  # ms
        return elapsed, resp.status_code
    except Exception as exc:
        return None, str(exc)


async def benchmark_endpoint(method: str, path: str, json_data: dict | None):
    latencies = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = []
        for _ in range(CONCURRENT_USERS):
            for _ in range(REQUESTS_PER_USER):
                tasks.append(make_request(client, method, path, json_data))
        results = await asyncio.gather(*tasks)
        for lat, _code in results:
            if lat is not None:
                latencies.append(lat)
    if latencies:
        p50 = np.percentile(latencies, 50)
        p95 = np.percentile(latencies, 95)
        return round(p50, 1), round(p95, 1), len(latencies)
    return None, None, 0


async def run_all():
    print(f"=== Concurrent Load Benchmark ({CONCURRENT_USERS} users) ===")
    for _name, method, path, data in ENDPOINTS:
        p50, p95, count = await benchmark_endpoint(method, path, data)
        print(f"Endpoint: {path} | p50: {p50} ms | p95: {p95} ms | samples: {count}")


if __name__ == "__main__":
    asyncio.run(run_all())
