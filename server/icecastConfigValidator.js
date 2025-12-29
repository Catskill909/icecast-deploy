/**
 * Icecast Configuration Validator
 * Validates user input before saving to database and generating XML
 */

export function validateIcecastConfig(config) {
    const errors = [];

    // Max clients validation
    if (typeof config.maxClients !== 'number' || config.maxClients < 1 || config.maxClients > 10000) {
        errors.push({
            field: 'maxClients',
            message: 'Max clients must be between 1 and 10,000'
        });
    }

    // Max sources validation
    if (typeof config.maxSources !== 'number' || config.maxSources < 1 || config.maxSources > 100) {
        errors.push({
            field: 'maxSources',
            message: 'Max sources must be between 1 and 100'
        });
    }

    // Burst size validation
    if (typeof config.burstSize !== 'number' || config.burstSize < 0 || config.burstSize > 1048576) {
        errors.push({
            field: 'burstSize',
            message: 'Burst size must be between 0 and 1,048,576 bytes (1MB)'
        });
    }

    // Queue size validation
    if (typeof config.queueSize !== 'number' || config.queueSize < 65536 || config.queueSize > 10485760) {
        errors.push({
            field: 'queueSize',
            message: 'Queue size must be between 65,536 (64KB) and 10,485,760 bytes (10MB)'
        });
    }

    // Log level validation
    const validLogLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    if (!validLogLevels.includes(config.logLevel)) {
        errors.push({
            field: 'logLevel',
            message: 'Log level must be one of: ERROR, WARN, INFO, DEBUG'
        });
    }

    // CORS origins validation
    if (config.corsOrigins && Array.isArray(config.corsOrigins)) {
        config.corsOrigins.forEach((origin, idx) => {
            if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
                errors.push({
                    field: `corsOrigins[${idx}]`,
                    message: `Origin "${origin}" must start with http:// or https://`
                });
            }
            if (origin.endsWith('/')) {
                errors.push({
                    field: `corsOrigins[${idx}]`,
                    message: `Origin "${origin}" should not end with a slash`
                });
            }
        });
    }

    // Add performance warnings (non-blocking)
    const warnings = [];

    if (config.burstSize < 32768) {
        warnings.push({
            field: 'burstSize',
            message: 'Burst size below 32KB may cause stuttering on slow connections'
        });
    }

    if (config.logLevel === 'DEBUG') {
        warnings.push({
            field: 'logLevel',
            message: 'DEBUG logging increases disk usage. Use INFO for production.'
        });
    }

    return { errors, warnings };
}
