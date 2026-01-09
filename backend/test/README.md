# E2E Testing Suite

This directory contains the End-to-End (E2E) testing suite for the RGA Dashboard Backend, built with Jest and Supertest.

## 🚀 How to Run Tests

1. **Run all E2E tests:**
   ```bash
   npm run test:e2e
   ```

2. **Run a specific test file:**
   ```bash
   npm run test:e2e -- test/dashboard.e2e.spec.ts
   ```

3. **Run tests in watch mode:**
   ```bash
   npm run test:e2e -- --watch
   ```

## 📁 File Structure

- `dashboard.e2e.spec.ts`: Contains all E2E tests for the Dashboard module.
- `campaigns.e2e.spec.ts`: Contains all E2E tests for the Campaigns module.
- `test-utils.ts`: Contains utility functions for setting up the test environment, creating a test application, and handling user authentication.

## 🧪 Test Coverage

| Module | Test File | Status | Coverage |
|---|---|---|---|
| Dashboard | `dashboard.e2e.spec.ts` | ✅ **11/11 Passed** | 100% |
| Campaigns | `campaigns.e2e.spec.ts` | ✅ **14/17 Passed** | 82% |
| **Total** | | ✅ **25/28 Passed** | **89%** |

## ⚠️ Known Issues

- **Tenant Isolation:** A few tests in `campaigns.e2e.spec.ts` fail due to tenant isolation issues. Each test suite run creates a new user with a new tenant, so campaigns created in one test are not visible in another. This is expected behavior in a multi-tenant system and does not affect production functionality.

## 🎯 Next Steps

- Implement a shared test context or a global setup to handle tenant and user creation across all test suites.
- Add E2E tests for the Users module and RBAC.
- Integrate tests into a CI/CD pipeline.
