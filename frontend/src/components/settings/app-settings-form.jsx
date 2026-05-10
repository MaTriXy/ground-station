/**
 * @license
 * Copyright (c) 2025 Efstratios Goudelis
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { alpha } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../common/socket.jsx';
import { toast } from '../../utils/toast-with-timestamp.jsx';
import {
    SettingsActionFooter,
    SettingsBanner,
    SettingsMetaRow,
    SettingsSection,
    SettingsSurface,
    SettingsSurfaceHeader,
} from './shared/index.js';

const SOURCE_LABELS = {
    cli: 'CLI Override',
    file: 'Config File',
    default: 'Default',
};

const getSettingCardBackground = (applyMode, theme) => {
    void applyMode;
    return theme.palette.mode === 'dark'
        ? alpha(theme.palette.grey[900], 0.22)
        : alpha(theme.palette.grey[700], 0.14);
};

const formatFieldName = (key) =>
    String(key || '')
        .split('_')
        .filter(Boolean)
        .map((part) => {
            const normalized = part.toLowerCase();
            if (normalized === 'db') {
                return 'DB';
            }
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(' ');

const parseStringList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .replace(/,/g, '\n')
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const toDraftValue = (field, value) => {
    if (field.value_type === 'boolean') {
        return Boolean(value);
    }
    if (field.value_type === 'integer') {
        return value == null ? '' : String(value);
    }
    if (field.value_type === 'string_list') {
        return parseStringList(value).join('\n');
    }
    return value == null ? '' : String(value);
};

const normalizeDraftForCompare = (field, value) => {
    if (field.value_type === 'boolean') {
        return Boolean(value);
    }
    if (field.value_type === 'integer') {
        return typeof value === 'string' ? value.trim() : String(value ?? '');
    }
    if (field.value_type === 'string_list') {
        return parseStringList(value);
    }
    return String(value ?? '');
};

const toSubmitValue = (field, value) => {
    if (field.value_type === 'boolean') {
        return Boolean(value);
    }
    if (field.value_type === 'integer') {
        return typeof value === 'string' ? value.trim() : value;
    }
    if (field.value_type === 'string_list') {
        return parseStringList(value);
    }
    return String(value ?? '').trim();
};

const buildDraftFromPayload = (payload) => {
    const fields = Array.isArray(payload?.fields) ? payload.fields : [];
    const values = payload?.values || {};
    const nextDraft = {};

    fields.forEach((field) => {
        const rawValue = Object.prototype.hasOwnProperty.call(values, field.key)
            ? values[field.key]
            : field.default;
        nextDraft[field.key] = toDraftValue(field, rawValue);
    });

    return nextDraft;
};

const AppSettingsForm = () => {
    const { socket } = useSocket();
    const { t } = useTranslation('settings');
    const navigate = useNavigate();

    const [payload, setPayload] = useState(null);
    const [draft, setDraft] = useState({});
    const [savedDraft, setSavedDraft] = useState({});
    const [visibleSensitive, setVisibleSensitive] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [loadError, setLoadError] = useState('');
    const [saveResult, setSaveResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fields = Array.isArray(payload?.fields) ? payload.fields : [];

    const changedKeys = useMemo(() => {
        return fields
            .filter((field) => {
                const current = normalizeDraftForCompare(field, draft[field.key]);
                const baseline = normalizeDraftForCompare(field, savedDraft[field.key]);
                return JSON.stringify(current) !== JSON.stringify(baseline);
            })
            .map((field) => field.key);
    }, [draft, fields, savedDraft]);

    const isDirty = changedKeys.length > 0;

    const groupedFields = useMemo(() => {
        const groups = {
            restart_required: [],
            hot: [],
            other: [],
        };

        // Keep original backend field order while grouping by apply mode for easier scanning.
        fields.forEach((field) => {
            if (field.apply_mode === 'restart_required') {
                groups.restart_required.push(field);
                return;
            }
            if (field.apply_mode === 'hot') {
                groups.hot.push(field);
                return;
            }
            groups.other.push(field);
        });

        return [
            {
                key: 'restart_required',
                title: t('app_settings.group_restart_required', { defaultValue: 'Restart Required' }),
                description: t('app_settings.group_restart_required_help', {
                    defaultValue: 'Changes in this section need a service restart before taking effect.',
                }),
                fields: groups.restart_required,
            },
            {
                key: 'hot',
                title: t('app_settings.group_hot_apply', { defaultValue: 'Hot Apply' }),
                description: t('app_settings.group_hot_apply_help', {
                    defaultValue: 'Changes in this section are applied immediately.',
                }),
                fields: groups.hot,
            },
            {
                key: 'other',
                title: t('app_settings.group_other', { defaultValue: 'Other Settings' }),
                description: '',
                fields: groups.other,
            },
        ].filter((group) => group.fields.length > 0);
    }, [fields, t]);

    const statusLabel = saving
        ? t('app_settings.saving', { defaultValue: 'Saving...' })
        : loading
            ? t('app_settings.loading_state', { defaultValue: 'Loading' })
        : isDirty
            ? t('app_settings.unsaved', { defaultValue: 'Unsaved changes' })
            : t('app_settings.saved', { defaultValue: 'Saved' });

    const statusColor = saving || loading ? 'info' : (isDirty ? 'warning' : 'success');

    const footerStatusText = loading && fields.length === 0
        ? t('app_settings.loading', { defaultValue: 'Loading application settings...' })
        : statusLabel;

    const settingsCountLabel = `${fields.length} ${t('app_settings.settings_count_suffix', { defaultValue: 'settings' })}`;

    const loadConfig = useCallback(() => {
        if (!socket) {
            return;
        }

        setLoading(true);
        setLoadError('');

        socket.emit('data_request', 'get-app-config', null, (response) => {
            if (!response?.success) {
                const errorMessage = response?.error || 'Failed to load application settings';
                setLoadError(errorMessage);
                setLoading(false);
                return;
            }

            const nextPayload = response.data || {};
            const nextDraft = buildDraftFromPayload(nextPayload);
            const nextSensitive = {};

            (nextPayload.fields || []).forEach((field) => {
                if (field.sensitive) {
                    nextSensitive[field.key] = false;
                }
            });

            setPayload(nextPayload);
            setDraft(nextDraft);
            setSavedDraft(nextDraft);
            setVisibleSensitive(nextSensitive);
            setValidationErrors({});
            setSaveResult(null);
            setLoadError('');
            setLoading(false);
        });
    }, [socket]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleFieldChange = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
        setValidationErrors((prev) => {
            if (!prev[key]) return prev;
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });
    };

    const handleReset = () => {
        setDraft(savedDraft);
        setValidationErrors({});
        setSaveResult(null);
    };

    const handleToggleSensitive = (key) => {
        setVisibleSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        if (!socket || saving || !isDirty) {
            return;
        }

        const updates = {};
        fields.forEach((field) => {
            if (changedKeys.includes(field.key)) {
                updates[field.key] = toSubmitValue(field, draft[field.key]);
            }
        });

        setSaving(true);
        setValidationErrors({});
        setSaveResult(null);

        socket.emit('data_submission', 'update-app-config', { values: updates }, (response) => {
            if (!response?.success) {
                const nextValidationErrors = response?.data?.validation_errors || {};
                const errorMessage = response?.error || 'Failed to save application settings';
                setValidationErrors(nextValidationErrors);
                toast.error(errorMessage);
                setSaving(false);
                return;
            }

            const nextPayload = response.data || {};
            const nextDraft = buildDraftFromPayload(nextPayload);
            setPayload(nextPayload);
            setDraft(nextDraft);
            setSavedDraft(nextDraft);
            setValidationErrors({});

            const changed = nextPayload.changed_keys || [];
            if (changed.length > 0) {
                toast.success(
                    t('app_settings.save_success', {
                        defaultValue: 'Application settings were saved.',
                    })
                );
            }

            setSaveResult({
                changedKeys: changed,
                changedHotKeys: nextPayload.changed_hot_keys || [],
                changedRestartKeys: nextPayload.changed_restart_keys || [],
                restartRequired: Boolean(nextPayload.restart_required),
            });
            setSaving(false);
        });
    };

    const renderFieldControl = (field) => {
        const fieldKey = field.key;
        const value = draft[fieldKey];
        const validationMessage = validationErrors[fieldKey];
        const hasChoices = Array.isArray(field.choices) && field.choices.length > 0;
        const rangeHelper = field.minimum != null || field.maximum != null
            ? `Range: ${field.minimum ?? '-inf'} .. ${field.maximum ?? '+inf'}`
            : '';
        const listHelper = field.value_type === 'string_list'
            ? t('app_settings.one_per_line', { defaultValue: 'One value per line.' })
            : '';
        const helperText = [rangeHelper, listHelper].filter(Boolean).join(' ');

        if (field.value_type === 'boolean') {
            return (
                <Stack spacing={1.5}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={Boolean(value)}
                                onChange={(event) => handleFieldChange(fieldKey, event.target.checked)}
                                disabled={loading || saving}
                            />
                        }
                        label={
                            <Stack spacing={0.25} sx={{ pr: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {field.description}
                                </Typography>
                            </Stack>
                        }
                        sx={{ m: 0 }}
                    />
                    {validationMessage && (
                        <Alert severity="error" sx={{ py: 0 }}>
                            {validationMessage}
                        </Alert>
                    )}
                </Stack>
            );
        }

        if (field.value_type === 'string_list') {
            return (
                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={10}
                    size="small"
                    label={formatFieldName(fieldKey)}
                    value={value ?? ''}
                    onChange={(event) => handleFieldChange(fieldKey, event.target.value)}
                    helperText={validationMessage || helperText}
                    error={Boolean(validationMessage)}
                    disabled={loading || saving}
                />
            );
        }

        if (hasChoices) {
            return (
                <TextField
                    fullWidth
                    select
                    size="small"
                    label={formatFieldName(fieldKey)}
                    value={value ?? ''}
                    onChange={(event) => handleFieldChange(fieldKey, event.target.value)}
                    helperText={validationMessage || helperText}
                    error={Boolean(validationMessage)}
                    disabled={loading || saving}
                >
                    {field.choices.map((choice) => (
                        <MenuItem key={`${fieldKey}-${choice}`} value={String(choice)}>
                            {String(choice)}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        const isSensitive = Boolean(field.sensitive);
        const isVisible = Boolean(visibleSensitive[fieldKey]);
        const isInteger = field.value_type === 'integer';

        return (
            <TextField
                fullWidth
                size="small"
                type={isSensitive && !isVisible ? 'password' : (isInteger ? 'number' : 'text')}
                label={formatFieldName(fieldKey)}
                value={value ?? ''}
                onChange={(event) => handleFieldChange(fieldKey, event.target.value)}
                helperText={validationMessage || helperText}
                error={Boolean(validationMessage)}
                disabled={loading || saving}
                inputProps={isInteger ? { min: field.minimum, max: field.maximum, step: 1 } : undefined}
                InputProps={
                    isSensitive
                        ? {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={() => handleToggleSensitive(fieldKey)}
                                        aria-label={isVisible ? 'Hide value' : 'Show value'}
                                    >
                                        {isVisible ? (
                                            <VisibilityOffIcon fontSize="small" />
                                        ) : (
                                            <VisibilityIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }
                        : undefined
                }
            />
        );
    };

    if (!socket) {
        return (
            <SettingsSurface>
                <SettingsBanner severity="warning">
                    {t('app_settings.no_socket', {
                        defaultValue: 'No active backend connection.',
                    })}
                </SettingsBanner>
            </SettingsSurface>
        );
    }

    return (
        <SettingsSurface>
            <Stack spacing={2}>
                <SettingsSurfaceHeader
                    title={t('app_settings.title', { defaultValue: 'Application Settings' })}
                    subtitle={t('app_settings.subtitle', {
                        defaultValue: 'Manage backend configuration values and apply-mode behavior.',
                    })}
                    status={{ label: statusLabel, color: statusColor }}
                    onReload={loadConfig}
                    reloadLabel={t('app_settings.reload', { defaultValue: 'Reload' })}
                    reloadDisabled={loading || saving}
                />

                <SettingsMetaRow sx={{ justifyContent: 'space-between' }}>
                    {payload?.config_path ? (
                        <Typography variant="body2" color="text.secondary">
                            {t('app_settings.config_path', {
                                defaultValue: 'Config file: {{path}}',
                                path: payload.config_path,
                            })}
                        </Typography>
                    ) : (
                        <Box />
                    )}
                    <Typography variant="body2" color="text.secondary">
                        {settingsCountLabel}
                    </Typography>
                </SettingsMetaRow>

                {loadError && (
                    <SettingsBanner severity="error">
                        <AlertTitle>{t('app_settings.load_failed', { defaultValue: 'Load failed' })}</AlertTitle>
                        {loadError}
                    </SettingsBanner>
                )}

                {saveResult?.changedKeys?.length > 0 && (
                    <SettingsBanner severity={saveResult.restartRequired ? 'warning' : 'success'}>
                        <AlertTitle>
                            {saveResult.restartRequired
                                ? t('app_settings.restart_needed_title', { defaultValue: 'Restart Required' })
                                : t('app_settings.save_complete_title', { defaultValue: 'Save Complete' })}
                        </AlertTitle>
                        <Typography variant="body2">
                            {t('app_settings.updated_keys', {
                                defaultValue: 'Updated: {{keys}}',
                                keys: saveResult.changedKeys.join(', '),
                            })}
                        </Typography>
                        {saveResult.restartRequired && (
                            <Button
                                size="small"
                                sx={{ mt: 1 }}
                                onClick={() => navigate('/settings/maintenance?mtab=system-control')}
                            >
                                {t('app_settings.open_restart', { defaultValue: 'Open Maintenance' })}
                            </Button>
                        )}
                    </SettingsBanner>
                )}

                {loading && fields.length === 0 && (
                    <SettingsBanner severity="info">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={18} />
                            <Typography variant="body2">
                                {t('app_settings.loading', { defaultValue: 'Loading application settings...' })}
                            </Typography>
                        </Stack>
                    </SettingsBanner>
                )}

                {groupedFields.map((group) => (
                    <SettingsSection
                        key={group.key}
                        title={group.title}
                        description={group.description || null}
                        meta={(
                            <Typography variant="caption" color="text.secondary">
                                {`${group.fields.length} ${t('app_settings.fields_suffix', { defaultValue: 'fields' })}`}
                            </Typography>
                        )}
                    >
                        <Grid container spacing={1.25} columns={12}>
                            {group.fields.map((field) => {
                                const source = payload?.source?.[field.key] || 'default';
                                const locked = Boolean(payload?.locked?.[field.key]);
                                const definedInFile = Boolean(payload?.defined_in_file?.[field.key]);
                                const forceFullWidth = field.value_type === 'string_list' || field.value_type === 'boolean';
                                return (
                                    <Grid
                                        key={field.key}
                                        size={{ xs: 12, md: forceFullWidth ? 12 : 6 }}
                                    >
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                backgroundColor: (theme) => getSettingCardBackground(field.apply_mode, theme),
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                            }}
                                        >
                                            <Stack spacing={0.4}>
                                                <Typography variant="subtitle2">
                                                    {formatFieldName(field.key)}
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        color="text.disabled"
                                                        sx={{ ml: 0.75, fontWeight: 400 }}
                                                    >
                                                        ({field.key})
                                                    </Typography>
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {field.description}
                                                </Typography>
                                            </Stack>

                                            <SettingsMetaRow>
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('app_settings.source_text', {
                                                        defaultValue: 'Source: {{source}}',
                                                        source: SOURCE_LABELS[source] || source,
                                                    })}
                                                </Typography>
                                                {locked && (
                                                    <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                                                        {t('app_settings.locked', { defaultValue: 'CLI override active' })}
                                                    </Typography>
                                                )}
                                                {!definedInFile && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {t('app_settings.not_in_file', { defaultValue: 'Not in file' })}
                                                    </Typography>
                                                )}
                                            </SettingsMetaRow>
                                            {renderFieldControl(field)}
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </SettingsSection>
                ))}

                <SettingsActionFooter statusText={footerStatusText}>
                    <Button variant="outlined" onClick={handleReset} disabled={saving || loading || !isDirty}>
                        {t('app_settings.reset', { defaultValue: 'Reset' })}
                    </Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving || loading || !isDirty}>
                        {saving
                            ? t('app_settings.saving', { defaultValue: 'Saving...' })
                            : t('app_settings.save', { defaultValue: 'Save Settings' })}
                    </Button>
                </SettingsActionFooter>
            </Stack>
        </SettingsSurface>
    );
};

export default AppSettingsForm;
