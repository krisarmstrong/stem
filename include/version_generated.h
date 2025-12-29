/*
 * version_generated.h - Version information for Seed Test Suite
 *
 * Copyright (c) 2025 Mustard Seed Networks. All rights reserved.
 */

#ifndef VERSION_GENERATED_H
#define VERSION_GENERATED_H

/* Version */
#define REFLECTOR_VERSION_MAJOR 3
#define REFLECTOR_VERSION_MINOR 0
#define REFLECTOR_VERSION_PATCH 0
#define REFLECTOR_VERSION_EXTRA "-dev"

/* Full version string */
#define REFLECTOR_VERSION_STRING "v3.0.0-dev"

/* Git metadata (placeholder - updated at build time) */
#define REFLECTOR_GIT_HASH "unknown"
#define REFLECTOR_GIT_DATE "2025-12-28"

/* Build information */
#define REFLECTOR_BUILD_DATE __DATE__
#define REFLECTOR_BUILD_TIME __TIME__

/* Helper macro to create version integer */
#define REFLECTOR_VERSION_CODE(major, minor, patch) (((major) << 16) | ((minor) << 8) | (patch))

/* Current version as integer for comparisons */
#define REFLECTOR_VERSION_NUMBER                                                                   \
	REFLECTOR_VERSION_CODE(REFLECTOR_VERSION_MAJOR, REFLECTOR_VERSION_MINOR,                       \
	                       REFLECTOR_VERSION_PATCH)

#endif /* VERSION_GENERATED_H */
