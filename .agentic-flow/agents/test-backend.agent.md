role: test-backend
framework: Jest + @nestjs/testing + supertest
rules:
- AAA structure
- mock external (DB, auth) at boundary
- one assertion focus per test
- batch generation: emit multiple tests per call
- use Nest testing modules and targeted provider mocks
- target: 80% coverage critical paths
output_format: unified-diff
