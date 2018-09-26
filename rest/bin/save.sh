#!/bin/bash
#
# This script runs within the CircleCI environment to build saas_ux images.

set -euo pipefail
IDS=$'\n\t'

source bin/common.sh

${dry_run} mkdir -p ${WORKSPACE}

for name in saas_ux; do
  if [ ! -z ${BUILD_DEV} ]; then
    ${dry_run} docker save -o ${WORKSPACE}/${name}.tar ssubbanna/${name}:dev

    continue
  fi

  # From this point on, not a dev build...

  name_tag="${name}:${tag}"

  # Save the image ${name} using tag ${tag}
  tags="ssubbanna/${name_tag}"

  ${dry_run} docker save -o ${WORKSPACE}/${name}.tar ${tags}
done
