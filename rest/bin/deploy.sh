#!/bin/bash
#
# This script runs within the CircleCI environment to deploy saas_ux-docker images
# to Docker Hub.

set -euo pipefail
IDS=$'\n\t'

source bin/common.sh

for name in saas_ux; do
  if [ ! -z ${BUILD_DEV} ]; then
    # Build unstable, and tag as "dev".

    # TODO: Potentially useful to prepend "dev" with revision of latest unstable
    #       release (e.g. "2.4dev")
    ${dry_run} docker push ssubbanna/${name}:dev
    continue
  fi

  # From this point on, not a dev build...
  name_tag="${name}:${tag}"

  if ${tagged_build}; then
    # gatekeeper.sh returns 'allow' on STDOUT if the images can be pushed
    if [ `bin/gatekeeper.sh ${name} ${tag}` != 'allow' ]; then
      echo "${name_tag} already exists on docker hub.. not pushing again!"
      exit 1
    fi
  fi

  ${dry_run} docker push ssubbanna/${name}:${tag}

  if ${tagged_build}; then
    if [ "${saas_ux_tag}" == "${latest_short}" ]; then
      ${dry_run} docker tag ssubbanna/${name_tag} ssubbanna/${name}:${short_tag}
      ${dry_run} docker push ssubbanna/${name}:${short_tag}
    fi

    if [ "${saas_ux_tag}" == "${latest}" ]; then
      ${dry_run} docker tag ssubbanna/${name_tag} ssubbanna/${name}:latest
      ${dry_run} docker push ssubbanna/${name}:latest
    fi
  fi
done
