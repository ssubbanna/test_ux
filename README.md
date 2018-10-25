# SaaS_UX_test
SaaS UX test repo

[![Packages Build Status](https://circleci.com/gh/extremenetworks/saas_ux_test/tree/master.svg?style=shield&circle-token=b619b21089647f85e198d5392e946a3c0fec7637)](https://circleci.com/gh/extremenetworks/saas_ux_test)

## Building SaaS UI docker image

### Testing
#### Circle CI
Run automatically on every pull request and on every commit. Please make sure Circle CI is green before merging.

#### Dev
The recommended approach is to run test inside docker containers so your dev machine is not polluted. Also, this is close to what Circle CI does with running tests inside a container.

To run tests with docker on your dev machine, please have [docker](docs.docker.com/install/) and [docker compose](https://docs.docker.com/compose/install/) installed.

To run tests, do ```docker-compose -f docker-compose-tests.yml up --build --exit-code-from tests ```
