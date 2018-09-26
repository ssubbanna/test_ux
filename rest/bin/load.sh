#!/bin/bash
#
# This script runs within the CircleCI environment to build saas_ux images.

set -euo pipefail
IDS=$'\n\t'

source bin/common.sh

for name in saas_ux; do
  # Load the tarball (tags are automatically loaded)
  ${dry_run} docker load -i ${WORKSPACE}/${name}.tar
done
