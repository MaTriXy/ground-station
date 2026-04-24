import * as React from 'react';
import {
    Alert,
    AlertTitle,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    TextField,
} from '@mui/material';
import Button from '@mui/material/Button';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { submitOrEditSatellite } from './satellite-slice.jsx';
import { useSocket } from '../common/socket.jsx';

const normalizeSatelliteFormValues = (satelliteData) => {
    if (!satelliteData) {
        return {
            id: null,
            name: '',
            norad_id: '',
            sat_id: '',
            status: '',
            tle1: '',
            tle2: '',
            is_frequency_violator: false,
            countries: '',
            operator: '',
            name_other: '',
            alternative_name: '',
            website: '',
            image: '',
        };
    }

    const details = satelliteData.details ?? satelliteData;
    const noradId = details.norad_id ?? satelliteData.norad_id ?? '';

    return {
        id: noradId || null,
        name: details.name ?? satelliteData.name ?? '',
        norad_id: noradId,
        sat_id: details.sat_id ?? satelliteData.sat_id ?? '',
        status: details.status ?? satelliteData.status ?? '',
        tle1: details.tle1 ?? satelliteData.tle1 ?? '',
        tle2: details.tle2 ?? satelliteData.tle2 ?? '',
        is_frequency_violator: Boolean(details.is_frequency_violator ?? satelliteData.is_frequency_violator),
        countries: details.countries ?? satelliteData.countries ?? '',
        operator: details.operator ?? satelliteData.operator ?? '',
        name_other: details.name_other ?? satelliteData.name_other ?? '',
        alternative_name: details.alternative_name ?? satelliteData.alternative_name ?? '',
        website: details.website ?? satelliteData.website ?? '',
        image: details.image ?? satelliteData.image ?? '',
    };
};

const SatelliteEditDialog = ({ open, onClose, satelliteData, onSaved }) => {
    const { t } = useTranslation('satellites');
    const dispatch = useDispatch();
    const { socket } = useSocket();

    const [formValues, setFormValues] = useState(() => normalizeSatelliteFormValues(satelliteData));
    const [submitError, setSubmitError] = useState('');
    const [submitErrorFields, setSubmitErrorFields] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasLocalEdits, setHasLocalEdits] = useState(false);
    const initializedSatelliteIdRef = useRef(null);

    useEffect(() => {
        if (!open) {
            initializedSatelliteIdRef.current = null;
            setHasLocalEdits(false);
            return;
        }

        const normalized = normalizeSatelliteFormValues(satelliteData);
        const incomingSatelliteId = normalized.id ?? normalized.norad_id ?? null;
        const isDifferentSatellite = initializedSatelliteIdRef.current !== incomingSatelliteId;

        // Keep form synced until the user starts typing; after that, only resync if editing another satellite.
        if (!hasLocalEdits || isDifferentSatellite) {
            setFormValues(normalized);
            setSubmitError('');
            setSubmitErrorFields({});
            initializedSatelliteIdRef.current = incomingSatelliteId;
            setHasLocalEdits(false);
        }
    }, [open, satelliteData, hasLocalEdits]);

    const validationErrors = useMemo(() => ({
        name: !String(formValues.name || '').trim(),
        norad_id: !formValues.id
            && (formValues.norad_id === '' || formValues.norad_id === null || formValues.norad_id === undefined),
        tle1: !String(formValues.tle1 || '').trim(),
        tle2: !String(formValues.tle2 || '').trim(),
    }), [formValues]);

    const isSubmitDisabled = Object.values(validationErrors).some(Boolean);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (submitError) {
            setSubmitError('');
            setSubmitErrorFields({});
        }
        setHasLocalEdits(true);
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setHasLocalEdits(true);
        setFormValues((prev) => ({ ...prev, [name]: checked }));
    };

    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    };

    const handleSubmit = () => {
        if (isSubmitDisabled || isSubmitting) {
            return;
        }
        setIsSubmitting(true);
        setSubmitError('');
        setSubmitErrorFields({});

        const payload = {
            ...formValues,
            norad_id: formValues.norad_id === '' ? '' : Number(formValues.norad_id),
        };

        dispatch(submitOrEditSatellite({ socket, formValues: payload }))
            .unwrap()
            .then((saved) => {
                if (typeof onSaved === 'function') {
                    onSaved(saved);
                }
                onClose();
            })
            .catch((error) => {
                const rawMessage = typeof error === 'string' ? error : (error?.message || String(error));
                setSubmitError(rawMessage);
                const requiredMatch = rawMessage.match(/Missing required field:\s*(\w+)/i);
                if (requiredMatch) {
                    setSubmitErrorFields({ [requiredMatch[1]]: true });
                } else if (/norad/i.test(rawMessage)) {
                    setSubmitErrorFields({ norad_id: true });
                }
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle
                sx={{
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    py: 2.5,
                }}
            >
                {formValues.id
                    ? t('satellite_database.dialog_title_edit_name', {
                        name: formValues.name || formValues.norad_id || '',
                    })
                    : t('satellite_database.dialog_title_add')}
            </DialogTitle>
            <DialogContent sx={{ bgcolor: 'background.paper', px: 3, py: 3 }}>
                <Stack spacing={2} sx={{ mt: 3 }}>
                    {submitError ? (
                        <Alert severity="error">
                            <AlertTitle>
                                {formValues.id ? t('satellite_database.failed_update') : t('satellite_database.failed_add')}
                            </AlertTitle>
                            {submitError}
                        </Alert>
                    ) : null}
                    <TextField
                        label={t('satellite_database.name')}
                        name="name"
                        value={formValues.name || ''}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        size="small"
                        error={Boolean(validationErrors.name || submitErrorFields.name)}
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.norad_id')}
                        name="norad_id"
                        value={formValues.norad_id || ''}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        type="number"
                        disabled={Boolean(formValues.id) || isSubmitting}
                        size="small"
                        error={Boolean(validationErrors.norad_id || submitErrorFields.norad_id)}
                    />
                    <TextField
                        label={t('satellite_database.sat_id')}
                        name="sat_id"
                        value={formValues.sat_id || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.status')}
                        name="status"
                        value={formValues.status || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                    <FormControlLabel
                        control={(
                            <Checkbox
                                checked={Boolean(formValues.is_frequency_violator)}
                                onChange={handleCheckboxChange}
                                name="is_frequency_violator"
                                size="small"
                                disabled={isSubmitting}
                            />
                        )}
                        label={t('satellite_database.is_frequency_violator')}
                    />
                    <TextField
                        label={t('satellite_database.tle1')}
                        name="tle1"
                        value={formValues.tle1 || ''}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        multiline
                        minRows={2}
                        size="small"
                        error={Boolean(validationErrors.tle1 || submitErrorFields.tle1)}
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.tle2')}
                        name="tle2"
                        value={formValues.tle2 || ''}
                        onChange={handleInputChange}
                        fullWidth
                        required
                        multiline
                        minRows={2}
                        size="small"
                        error={Boolean(validationErrors.tle2 || submitErrorFields.tle2)}
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.operator')}
                        name="operator"
                        value={formValues.operator || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.countries')}
                        name="countries"
                        value={formValues.countries || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.name_other')}
                        name="name_other"
                        value={formValues.name_other || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.alternative_name')}
                        name="alternative_name"
                        value={formValues.alternative_name || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.website')}
                        name="website"
                        value={formValues.website || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                    <TextField
                        label={t('satellite_database.image')}
                        name="image"
                        value={formValues.image || ''}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isSubmitting}
                    />
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                    px: 3,
                    py: 2.5,
                    gap: 2,
                }}
            >
                <Button onClick={handleClose} variant="outlined" disabled={isSubmitting}>
                    {t('satellite_database.cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    color="success"
                    disabled={isSubmitDisabled || isSubmitting}
                >
                    {formValues.id ? t('satellite_database.edit') : t('satellite_database.submit')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SatelliteEditDialog;
