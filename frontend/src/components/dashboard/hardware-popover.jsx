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

import Stack from "@mui/material/Stack";
import * as React from "react";
import {
    Box, Button, Chip, IconButton, Typography,
} from "@mui/material";
import {useCallback, useEffect, useRef, useState} from "react";
import {useSocket} from "../common/socket.jsx";
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from 'react-i18next';
import RadioIcon from '@mui/icons-material/Radio';
import {
    Popover,
} from '@mui/material';
import {SatelliteIcon} from "hugeicons-react";
import OverlayIcon from "./icons-overlay.jsx";

// Import overlay icons
import CloseIcon from '@mui/icons-material/Close';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WarningIcon from '@mui/icons-material/Warning';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { setTrackerId, setTrackingStateInBackend } from "../target/target-slice.jsx";
import { TRACKER_COMMAND_STATUS } from "../target/tracking-constants.js";
import FleetTargetRow from "../common/fleet-target-row.jsx";

const HardwareSettingsPopover = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation('dashboard');
    const {socket} = useSocket();
    const buttonRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(buttonRef.current);
    const open = Boolean(anchorEl);
    const [activeIcon, setActiveIcon] = useState(null);
    const [connected, setConnected] = useState(false);
    const [rowErrors, setRowErrors] = useState({});
    const trackerId = useSelector((state) => state.targetSatTrack?.trackerId || "");
    const trackerInstances = useSelector((state) => state.trackerInstances?.instances || []);
    const trackerViews = useSelector((state) => state.targetSatTrack?.trackerViews || {});
    const trackerCommandsById = useSelector((state) => state.targetSatTrack?.trackerCommandsById || {});
    const rotators = useSelector((state) => state.rotators?.rotators || []);
    const rigs = useSelector((state) => state.rigs?.rigs || []);
    const latestActiveTrackerIdRef = useRef(trackerId);

    useEffect(() => {
        latestActiveTrackerIdRef.current = trackerId;
    }, [trackerId]);
    const hasConfiguredTargets = React.useMemo(() => {
        const instances = Array.isArray(trackerInstances) ? trackerInstances : [];
        if (instances.length === 0) return false;
        return instances.some((instance) => {
            const instanceTrackerId = instance?.tracker_id || '';
            const view = trackerViews?.[instanceTrackerId] || {};
            const details = view?.satelliteData?.details || {};
            const tracking = view?.trackingState || {};
            const noradId = details?.norad_id ?? tracking?.norad_id ?? null;
            return !['', 'none', null, undefined].includes(noradId);
        });
    }, [trackerInstances, trackerViews]);

    // Keep selector output primitive/lightweight to reduce unnecessary re-renders.
    const hardwareState = useSelector((state) => {
        const selectedTrackerView = (trackerId && trackerViews?.[trackerId]) || null;
        const rigData = selectedTrackerView?.rigData || state.targetSatTrack?.rigData || {};
        const rotatorData = selectedTrackerView?.rotatorData || state.targetSatTrack?.rotatorData || {};
        return {
            rigConnected: Boolean(rigData.connected),
            rigTracking: Boolean(rigData.tracking),
            rigStopped: Boolean(rigData.stopped),
            rigFrequency: rigData.frequency,
            rotatorConnected: Boolean(rotatorData.connected),
            rotatorOutOfBounds: Boolean(rotatorData.outofbounds),
            rotatorMinElevation: Boolean(rotatorData.minelevation),
            rotatorSlewing: Boolean(rotatorData.slewing),
            rotatorTracking: Boolean(rotatorData.tracking),
            rotatorStopped: Boolean(rotatorData.stopped),
            rotatorParked: Boolean(rotatorData.parked),
            rotatorAz: Number.isFinite(rotatorData.az) ? Math.round(rotatorData.az * 10) / 10 : rotatorData.az,
            rotatorEl: Number.isFinite(rotatorData.el) ? Math.round(rotatorData.el * 10) / 10 : rotatorData.el,
        };
    }, shallowEqual);

    // Socket connection event handlers
    useEffect(() => {
        if (!socket) return;

        // Component can mount after the socket is already connected
        // (e.g. after app-provider remount when navigation changes).
        setConnected(Boolean(socket.connected));

        const handleConnect = () => {
            setConnected(true);
        };

        const handleDisconnect = (reason) => {
            setConnected(false);
        };

        // Add event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        // Cleanup function to remove listeners
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [socket]);

    const handleClick = (event, iconType) => {
        if (!connected) return; // Don't open popover when socket is disconnected
        setAnchorEl(event.currentTarget);
        setActiveIcon(iconType);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setActiveIcon(null);
    };

    // Determine colors based on connection and tracking status
    const getRigColor = () => {
        if (!hasConfiguredTargets) return 'text.disabled'; // Grey when there are no targets configured
        if (!connected) return 'text.disabled'; // Grey when socket disconnected
        if (!hardwareState.rigConnected) return 'status.disconnected'; // Red for disconnected
        if (hardwareState.rigTracking) return 'success.light'; // Green for tracking
        if (hardwareState.rigStopped) return 'warning.dark'; // Orange for stopped
        return 'success.dark'; // Green for connected but not tracking
    };

    const getRotatorColor = () => {
        if (!hasConfiguredTargets) return 'text.disabled'; // Grey when there are no targets configured
        if (!connected) return 'text.disabled'; // Grey when socket disconnected
        if (!hardwareState.rotatorConnected) return 'status.disconnected'; // Red for disconnected
        if (hardwareState.rotatorOutOfBounds) return 'secondary.main'; // Purple for out of bounds
        if (hardwareState.rotatorMinElevation) return 'error.light'; // Light red for min elevation
        if (hardwareState.rotatorSlewing) return 'warning.main'; // Orange for slewing
        if (hardwareState.rotatorTracking) return 'success.light'; // Light green for tracking
        if (hardwareState.rotatorStopped) return 'warning.dark'; // Orange for stopped
        return 'success.dark'; // Green for connected but not tracking
    };

    const getRigTooltip = () => {
        if (!hasConfiguredTargets) return t('hardware_popover.no_targets_configured', { defaultValue: 'No targets configured' });
        if (!connected) return t('hardware_popover.socket_disconnected');
        if (!hardwareState.rigConnected) return t('hardware_popover.rig_disconnected');
        if (hardwareState.rigTracking) return t('hardware_popover.rig_tracking', { frequency: hardwareState.rigFrequency });
        if (hardwareState.rigStopped) return t('hardware_popover.rig_stopped');
        return t('hardware_popover.rig_connected');
    };

    const getRotatorTooltip = () => {
        if (!hasConfiguredTargets) return t('hardware_popover.no_targets_configured', { defaultValue: 'No targets configured' });
        if (!connected) return t('hardware_popover.socket_disconnected');
        if (!hardwareState.rotatorConnected) return t('hardware_popover.rotator_disconnected');
        if (hardwareState.rotatorTracking) return t('hardware_popover.rotator_tracking', { az: hardwareState.rotatorAz, el: hardwareState.rotatorEl });
        if (hardwareState.rotatorSlewing) return t('hardware_popover.rotator_slewing', { az: hardwareState.rotatorAz, el: hardwareState.rotatorEl });
        if (hardwareState.rotatorStopped) return t('hardware_popover.rotator_stopped', { az: hardwareState.rotatorAz, el: hardwareState.rotatorEl });
        return t('hardware_popover.rotator_connected', { az: hardwareState.rotatorAz, el: hardwareState.rotatorEl });
    };

    // Get overlay icon and color for rotator
    const getRotatorOverlay = () => {
        if (!hasConfiguredTargets) return null; // No overlay when there are no targets configured
        if (!connected) return null; // No overlay when socket disconnected
        if (!hardwareState.rotatorConnected) return {
            icon: CloseIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'status.disconnected',
            badgeBorderColor: "text.primary"
        };
        if (hardwareState.rotatorParked) return {
            icon: LocalParkingIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'warning.main',
            badgeBorderColor: "text.primary"
        };
        if (hardwareState.rotatorOutOfBounds) return {
            icon: WarningIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'error.main',
            badgeBorderColor: "text.primary"
        };
        if (hardwareState.rotatorMinElevation) return {
            icon: ArrowDownwardIcon,
            color: 'error.main',
            badgeBackgroundColor: 'text.primary',
            badgeBorderColor: "error.main"
        };
        if (hardwareState.rotatorSlewing) return {
            icon: PlayArrowIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'success.main',
            badgeBorderColor: "text.primary"
        };
        if (hardwareState.rotatorTracking) return {
            icon: LocationSearchingIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'info.main',
            badgeBorderColor: "info.main"
        };
        if (hardwareState.rotatorStopped) return {
            icon: PauseIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'warning.main',
            badgeBorderColor: "text.primary"
        };

        // No overlay for "connected" states
        return null;
    };

    // Get overlay icon and color for the rig
    const getRigOverlay = () => {
        if (!hasConfiguredTargets) return null; // No overlay when there are no targets configured
        if (!connected) return null; // No overlay when socket disconnected
        if (!hardwareState.rigConnected) return {
            icon: CloseIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'status.disconnected',
            badgeBorderColor: "text.primary"
        };
        if (hardwareState.rigTracking) return {
            icon: LocationSearchingIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'info.main',
            badgeBorderColor: "info.main"
        };
        if (hardwareState.rigStopped) return {
            icon: PauseIcon,
            color: 'text.primary',
            badgeBackgroundColor: 'warning.main',
            badgeBorderColor: "text.primary"
        };

        // No overlay for "connected" state
        return null;
    };

    const rotatorOverlay = getRotatorOverlay();
    const rigOverlay = getRigOverlay();
    const rotatorNameById = React.useMemo(() => {
        const entries = Array.isArray(rotators) ? rotators : [];
        return entries.reduce((acc, rotator) => {
            const id = rotator?.id;
            if (id == null) return acc;
            acc[String(id)] = rotator?.name || String(id);
            return acc;
        }, {});
    }, [rotators]);
    const rigNameById = React.useMemo(() => {
        const entries = Array.isArray(rigs) ? rigs : [];
        return entries.reduce((acc, rig) => {
            const id = rig?.id;
            if (id == null) return acc;
            acc[String(id)] = rig?.name || String(id);
            return acc;
        }, {});
    }, [rigs]);

    const fleetRows = React.useMemo(() => {
        return trackerInstances.map((instance, index) => {
            const instanceTrackerId = instance?.tracker_id || '';
            const view = trackerViews?.[instanceTrackerId] || {};
            const trackingState = view?.trackingState || instance?.tracking_state || {};
            const rotatorData = view?.rotatorData || {};
            const rigData = view?.rigData || {};
            const targetNumber = Number(instance?.target_number || (index + 1));
            const command = trackerCommandsById?.[instanceTrackerId] || null;
            const commandBusy = Boolean(
                command
                && [TRACKER_COMMAND_STATUS.SUBMITTED, TRACKER_COMMAND_STATUS.STARTED].includes(command.status)
            );
            return {
                trackerId: instanceTrackerId,
                targetNumber,
                satName: view?.satelliteData?.details?.name || 'No satellite',
                satNorad: trackingState?.norad_id || 'none',
                rotatorId: trackingState?.rotator_id || instance?.rotator_id || 'none',
                rotatorName: rotatorNameById[String(trackingState?.rotator_id || instance?.rotator_id || '')] || 'No rotator',
                rigId: trackingState?.rig_id || instance?.rig_id || 'none',
                rigName: rigNameById[String(trackingState?.rig_id || instance?.rig_id || '')] || 'No rig',
                trackingState,
                rotatorData,
                rigData,
                commandBusy,
                isActive: instanceTrackerId === trackerId,
            };
        });
    }, [trackerInstances, trackerViews, trackerCommandsById, trackerId, rotatorNameById, rigNameById]);

    const submitQuickAction = useCallback(async (row, nextState) => {
        if (!row?.trackerId) return;
        const previouslyActiveTrackerId = latestActiveTrackerIdRef.current;
        setRowErrors((prev) => ({ ...prev, [row.trackerId]: null }));
        try {
            await dispatch(setTrackingStateInBackend({
                socket,
                data: {
                    ...row.trackingState,
                    tracker_id: row.trackerId,
                    ...nextState,
                },
            })).unwrap();
        } catch (error) {
            const message = error?.message || error?.error || 'Action failed';
            setRowErrors((prev) => ({ ...prev, [row.trackerId]: String(message) }));
            window.setTimeout(() => {
                setRowErrors((prev) => {
                    if (!prev?.[row.trackerId]) return prev;
                    const next = { ...prev };
                    delete next[row.trackerId];
                    return next;
                });
            }, 4000);
        } finally {
            // Preserve the user's active target when issuing per-row quick actions.
            // The tracking-state thunk sets trackerId to the command's target tracker; restore
            // only if selection is still on that row to avoid overriding explicit user changes.
            if (
                previouslyActiveTrackerId
                && previouslyActiveTrackerId !== row.trackerId
                && latestActiveTrackerIdRef.current === row.trackerId
            ) {
                dispatch(setTrackerId(previouslyActiveTrackerId));
            }
        }
    }, [dispatch, socket]);

    const renderCompactFleetPanel = () => {
        const isRotatorPanel = activeIcon === 'rotator';
        const panelTitle = isRotatorPanel ? 'Rotator Quick Actions' : 'Rig Quick Actions';
        const actionButtonSx = {
            minWidth: 30,
            px: 0.6,
            borderColor: 'divider',
            '&.Mui-disabled': {
                borderColor: 'action.disabledBackground',
                color: 'action.disabled',
            },
        };
        if (fleetRows.length === 0) {
            return (
                <Box sx={{ p: 1.25 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '12px' }}>
                        {panelTitle}
                    </Typography>
                    <Box
                        sx={{
                            mt: 0.9,
                            minHeight: 126,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.9,
                            textAlign: 'center',
                            border: '1px dashed',
                            borderColor: 'border.main',
                            borderRadius: 1,
                            px: 1.5,
                            py: 2,
                            backgroundColor: 'overlay.light',
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            No targets configured
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Add a target to enable per-target rig and rotator quick actions.
                        </Typography>
                    </Box>
                </Box>
            );
        }
        return (
            <Box sx={{ p: 0.9 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '12px' }}>
                    {panelTitle}
                </Typography>
                <Stack spacing={0.65} sx={{ mt: 0.7 }}>
                    {fleetRows.map((row) => {
                        const statusLabel = isRotatorPanel
                            ? (row.rotatorData?.tracking ? 'Tracking' : (row.rotatorData?.connected ? 'Connected' : 'Disconnected'))
                            : (row.rigData?.tracking ? 'Tracking' : (row.rigData?.connected ? 'Connected' : 'Disconnected'));
                        const formatHz = (value) => (
                            Number.isFinite(Number(value))
                                ? Number(value).toFixed(0)
                                : 'N/A'
                        );
                        const actionState = (() => {
                            const hasTarget = !['', 'none', null, undefined].includes(row.satNorad);
                            if (isRotatorPanel) {
                                const connectedNow = Boolean(row.rotatorData?.connected);
                                const trackingNow = Boolean(row.rotatorData?.tracking);
                                const canConnect = !row.commandBusy && !connectedNow && !['', 'none'].includes(row.rotatorId);
                                const canTrack = !row.commandBusy && connectedNow && !trackingNow && hasTarget;
                                const canStop = !row.commandBusy && trackingNow;
                                const canDisconnect = !row.commandBusy && connectedNow && !trackingNow;
                                return {
                                    connect: { enabled: canConnect, reason: canConnect ? 'Connect' : (['', 'none'].includes(row.rotatorId) ? 'No rotator assigned' : (connectedNow ? 'Already connected' : (row.commandBusy ? 'Command in progress' : 'Unavailable'))) },
                                    track: { enabled: canTrack, reason: canTrack ? 'Track' : (!connectedNow ? 'Connect first' : (!hasTarget ? 'No target selected' : (trackingNow ? 'Already tracking' : (row.commandBusy ? 'Command in progress' : 'Unavailable')))) },
                                    stop: { enabled: canStop, reason: canStop ? 'Stop' : (trackingNow ? 'Stop' : (row.commandBusy ? 'Command in progress' : 'Not tracking')) },
                                    disconnect: { enabled: canDisconnect, reason: canDisconnect ? 'Disconnect' : (trackingNow ? 'Stop tracking first' : (!connectedNow ? 'Already disconnected' : (row.commandBusy ? 'Command in progress' : 'Unavailable'))) },
                                };
                            }
                            const connectedNow = Boolean(row.rigData?.connected);
                            const trackingNow = Boolean(row.rigData?.tracking);
                            const hasTransmitter = !['', 'none', null, undefined].includes(row.trackingState?.transmitter_id);
                            const canConnect = !row.commandBusy && !connectedNow && !['', 'none'].includes(row.rigId);
                            const canTrack = !row.commandBusy && connectedNow && !trackingNow && hasTarget && hasTransmitter;
                            const canStop = !row.commandBusy && trackingNow;
                            const canDisconnect = !row.commandBusy && connectedNow && !trackingNow;
                            return {
                                connect: { enabled: canConnect, reason: canConnect ? 'Connect' : (['', 'none'].includes(row.rigId) ? 'No rig assigned' : (connectedNow ? 'Already connected' : (row.commandBusy ? 'Command in progress' : 'Unavailable'))) },
                                track: { enabled: canTrack, reason: canTrack ? 'Track' : (!connectedNow ? 'Connect first' : (!hasTarget ? 'No target selected' : (!hasTransmitter ? 'No transmitter selected' : (trackingNow ? 'Already tracking' : (row.commandBusy ? 'Command in progress' : 'Unavailable'))))) },
                                stop: { enabled: canStop, reason: canStop ? 'Stop' : (trackingNow ? 'Stop' : (row.commandBusy ? 'Command in progress' : 'Not tracking')) },
                                disconnect: { enabled: canDisconnect, reason: canDisconnect ? 'Disconnect' : (trackingNow ? 'Stop tracking first' : (!connectedNow ? 'Already disconnected' : (row.commandBusy ? 'Command in progress' : 'Unavailable'))) },
                            };
                        })();
                        const az = Number.isFinite(Number(row.rotatorData?.az)) ? Number(row.rotatorData.az).toFixed(1) : 'N/A';
                        const el = Number.isFinite(Number(row.rotatorData?.el)) ? Number(row.rotatorData.el).toFixed(1) : 'N/A';
                        const rigFrequency = formatHz(row.rigData?.frequency);
                        const rigVfo1 = formatHz(row.rigData?.vfo1?.frequency);
                        const rigVfo2 = formatHz(row.rigData?.vfo2?.frequency);
                        const rigDopplerShift = formatHz(row.rigData?.doppler_shift);
                        const rigDownlinkObserved = formatHz(row.rigData?.downlink_observed_freq);
                        return (
                            <Box key={row.trackerId}>
                                <FleetTargetRow
                                    targetNumber={row.targetNumber}
                                    trackingActive={Boolean(isRotatorPanel ? row.rotatorData?.tracking : row.rigData?.tracking)}
                                    satName={row.satName}
                                    satNorad={row.satNorad}
                                    elevation={null}
                                    isActive={false}
                                    onFocus={() => dispatch(setTrackerId(row.trackerId))}
                                    extraMeta={(
                                        <Box sx={{ width: '100%' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        minWidth: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontSize: '11px',
                                                        lineHeight: 1.25,
                                                    }}
                                                >
                                                    {isRotatorPanel ? row.rotatorName : row.rigName}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        marginLeft: 'auto',
                                                        color: 'text.secondary',
                                                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                                        fontFeatureSettings: '"tnum" 1',
                                                        whiteSpace: 'nowrap',
                                                        textAlign: 'right',
                                                        fontSize: '12px',
                                                        lineHeight: 1.25,
                                                    }}
                                                >
                                                    {isRotatorPanel ? `Az ${az}° El ${el}°` : `Freq ${rigFrequency} Hz`}
                                                </Typography>
                                            </Box>
                                            {!isRotatorPanel && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        display: 'block',
                                                        mt: 0.15,
                                                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                                        fontFeatureSettings: '"tnum" 1',
                                                        fontSize: '11px',
                                                        lineHeight: 1.25,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {`VFO1 ${rigVfo1} | VFO2 ${rigVfo2} | Df ${rigDopplerShift} | Obs ${rigDownlinkObserved}`}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                    statusChip={(
                                        <Chip
                                            size="small"
                                            label={statusLabel}
                                            color={statusLabel === 'Tracking' ? 'success' : (statusLabel === 'Connected' ? 'info' : 'default')}
                                            variant={statusLabel === 'Disconnected' ? 'outlined' : 'filled'}
                                            sx={{ '& .MuiChip-label': { fontSize: '11px' } }}
                                        />
                                    )}
                                    actions={(
                                        <Stack direction="row" spacing={0.5}>
                                        <Tooltip title={actionState.connect.reason}>
                                            <span>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="success"
                                                    disabled={!actionState.connect.enabled}
                                                    onClick={() => submitQuickAction(row, isRotatorPanel ? { rotator_state: 'connected' } : { rig_state: 'connected' })}
                                                    sx={actionButtonSx}
                                                >
                                                    <LinkIcon fontSize="small" />
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={actionState.track.reason}>
                                            <span>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                    disabled={!actionState.track.enabled}
                                                    onClick={() => submitQuickAction(row, isRotatorPanel ? { rotator_state: 'tracking' } : { rig_state: 'tracking' })}
                                                    sx={actionButtonSx}
                                                >
                                                    <TrackChangesIcon fontSize="small" />
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={actionState.stop.reason}>
                                            <span>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="warning"
                                                    disabled={!actionState.stop.enabled}
                                                    onClick={() => submitQuickAction(row, isRotatorPanel ? { rotator_state: 'stopped' } : { rig_state: 'stopped' })}
                                                    sx={actionButtonSx}
                                                >
                                                    <StopCircleOutlinedIcon fontSize="small" />
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={actionState.disconnect.reason}>
                                            <span>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    disabled={!actionState.disconnect.enabled}
                                                    onClick={() => submitQuickAction(row, isRotatorPanel ? { rotator_state: 'disconnected' } : { rig_state: 'disconnected' })}
                                                    sx={actionButtonSx}
                                                >
                                                    <LinkOffIcon fontSize="small" />
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        </Stack>
                                    )}
                                />
                                {rowErrors?.[row.trackerId] && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.35 }}>
                                        {rowErrors[row.trackerId]}
                                    </Typography>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            </Box>
        );
    };

    return (<>
        <Stack direction="row" spacing={0}>
            <Tooltip title={getRotatorTooltip()}>
                <IconButton
                    onClick={(event) => handleClick(event, 'rotator')}
                    size="small"
                    sx={{
                        width: 40, color: getRotatorColor(), '&:hover': {
                            backgroundColor: 'overlay.light'
                        }, '& svg': {
                            height: '100%',
                        }
                    }}
                >
                    <OverlayIcon
                        BaseIcon={SatelliteIcon}
                        OverlayIcon={rotatorOverlay?.icon}
                        overlayColor={rotatorOverlay?.color}
                        overlayPosition="bottom-right"
                        overlaySize={0.9}
                        fontSize="small"
                        badgeBackgroundColor={rotatorOverlay?.badgeBackgroundColor}
                        badgeBorderColor={rotatorOverlay?.badgeBorderColor}
                    />
                </IconButton>
            </Tooltip>
            <Tooltip title={getRigTooltip()}>
                <IconButton
                    ref={buttonRef}
                    onClick={(event) => handleClick(event, 'rig')}
                    size="small"
                    sx={{
                        width: 40, color: getRigColor(), '&:hover': {
                            backgroundColor: 'overlay.light'
                        }, '& svg': {
                            height: '100%',
                            width: '80%',
                        }
                    }}
                >
                    <OverlayIcon
                        BaseIcon={RadioIcon}
                        OverlayIcon={rigOverlay?.icon}
                        overlayColor={rigOverlay?.color}
                        overlayPosition="bottom-right"
                        overlaySize={0.9}
                        fontSize="small"
                        badgeBackgroundColor={rigOverlay?.badgeBackgroundColor}
                        badgeBorderColor={rigOverlay?.badgeBorderColor}
                    />
                </IconButton>
            </Tooltip>
        </Stack>
        <Popover
            sx={{
                '& .MuiPaper-root': {
                    borderRadius: 0,
                }
            }}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'bottom', horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top', horizontal: 'right',
            }}
        >
            <Box sx={{
                borderRadius: 0,
                border: '1px solid',
                borderColor: 'border.main',
                p: 0,
                minWidth: 340,
                width: 340,
                backgroundColor: 'background.paper',
            }}>
                {renderCompactFleetPanel()}
            </Box>
        </Popover>
    </>);
};

export default React.memo(HardwareSettingsPopover);
