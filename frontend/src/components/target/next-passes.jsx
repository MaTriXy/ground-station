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


import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useSocket} from "../common/socket.jsx";
import {
    getClassNamesBasedOnGridEditing,
    getTimeFromISO,
    humanizeFutureDateInMinutes,
    TitleBar
} from "../common/common.jsx";
import {DataGrid, gridClasses, useGridApiRef} from "@mui/x-data-grid";
import { useDispatch, useSelector } from 'react-redux';
import {alpha, darken, lighten, styled} from "@mui/material/styles";
import {Box, Typography, IconButton, Tooltip, Button, Chip, useMediaQuery, useTheme} from '@mui/material';
import ProgressFormatter from "../overview/progressbar-widget.jsx";
import { useTranslation } from 'react-i18next';
import { enUS, elGR } from '@mui/x-data-grid/locales';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import {
    fetchNextPasses,
    updateSatellitePassesWithElevationCurves,
    setPassesTableColumnVisibility,
    setPassesTablePageSize,
    setPassesTableSortModel,
    setOpenPassesTableSettingsDialog
} from './target-slice.jsx';
import {calculateElevationCurvesForPasses} from '../../utils/elevation-curve-calculator.js';
import TargetPassesTableSettingsDialog from './target-passes-table-settings-dialog.jsx';
import { useUserTimeSettings } from '../../hooks/useUserTimeSettings.jsx';

const getPassStatus = (row, now = new Date()) => {
    const startDate = new Date(row?.event_start);
    const endDate = new Date(row?.event_end);
    if (startDate <= now && endDate >= now) return 'live';
    if (endDate < now) return 'passed';
    return 'upcoming';
};

const getPassStatusPriority = (status) => {
    switch (status) {
        case 'live':
            return 0;
        case 'upcoming':
            return 1;
        case 'passed':
            return 2;
        default:
            return 3;
    }
};

const getPassBackgroundColor = (color, theme, coefficient) => ({
    backgroundColor: darken(color, coefficient),
    ...theme.applyStyles('light', {
        backgroundColor: lighten(color, coefficient),
    }),
});

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    '& .MuiDataGrid-row': {
        borderLeft: '3px solid transparent',
    },
    '& .passes-row-live': {
        backgroundColor: alpha(theme.palette.success.main, 0.2),
        borderLeftColor: alpha(theme.palette.success.main, 0.95),
        ...theme.applyStyles('light', {
            backgroundColor: alpha(theme.palette.success.main, 0.1),
            borderLeftColor: alpha(theme.palette.success.main, 0.65),
        }),
    },
    '& .passes-row-passed': {
        backgroundColor: alpha(theme.palette.info.main, 0.22),
        borderLeftColor: alpha(theme.palette.info.main, 0.85),
        ...theme.applyStyles('light', {
            backgroundColor: alpha(theme.palette.info.main, 0.12),
            borderLeftColor: alpha(theme.palette.info.main, 0.55),
        }),
    },
    '& .passes-cell-passing': {
        ...getPassBackgroundColor(theme.palette.success.main, theme, 0.7),
        '&:hover': {
            ...getPassBackgroundColor(theme.palette.success.main, theme, 0.6),
        },
        '&.Mui-selected': {
            ...getPassBackgroundColor(theme.palette.success.main, theme, 0.5),
            '&:hover': {
                ...getPassBackgroundColor(theme.palette.success.main, theme, 0.4),
            },
        },
    },
    '& .passes-cell-passed': {
        ...getPassBackgroundColor(theme.palette.info.main, theme, 0.7),
        '&:hover': {
            ...getPassBackgroundColor(theme.palette.info.main, theme, 0.6),
        },
        '&.Mui-selected': {
            ...getPassBackgroundColor(theme.palette.info.main, theme, 0.5),
            '&:hover': {
                ...getPassBackgroundColor(theme.palette.info.main, theme, 0.4),
            },
        },
        textDecoration: 'line-through',
    },
    '& .passes-cell-warning': {
        color: theme.palette.error.main,
        textDecoration: 'line-through',
    },
    '& .passes-cell-success': {
        color: theme.palette.success.main,
        fontWeight: 'bold',
        textDecoration: 'underline',
    }
}));


const TimeFormatter = React.memo(function TimeFormatter({ value, nowMs }) {
    const { timezone, locale } = useUserTimeSettings();
    const relativeTime = useMemo(() => humanizeFutureDateInMinutes(value), [value, nowMs]);

    return (
        <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Typography component="span" variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {relativeTime}
            </Typography>
            <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                · {getTimeFromISO(value, timezone, locale)}
            </Typography>
        </Box>
    );
});


const DurationFormatter = React.memo(function DurationFormatter({params, event_start, event_end, nowMs}) {
    const now = new Date(nowMs);
    const startDate = new Date(event_start);
    const endDate = new Date(event_end);

    if (params.row.is_geostationary || params.row.is_geosynchronous) {
        return "∞";
    }

    if (startDate > now) {
        // Pass is in the future
        const diffInSeconds = Math.floor((endDate - startDate) / 1000);
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;

    } else if(endDate < now) {
        // Pass ended
        const diffInSeconds = Math.floor((endDate - startDate) / 1000);
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;

    } else if (startDate < now && now < endDate) {
        // Passing now
        const diffInSeconds = Math.floor((endDate - now) / 1000);
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;

    } else {
        return `no value`;
    }
});

const PassStatusCell = React.memo(function PassStatusCell({status}) {
    const statusConfig = {
        live: {
            label: 'Live',
            color: 'success',
            icon: <RadioButtonCheckedIcon sx={{ fontSize: '0.85rem' }} />,
        },
        upcoming: {
            label: 'Upcoming',
            color: 'warning',
            icon: <AccessTimeFilledIcon sx={{ fontSize: '0.85rem' }} />,
        },
        passed: {
            label: 'Passed',
            color: 'info',
            icon: <DoneAllIcon sx={{ fontSize: '0.85rem' }} />,
        },
    };
    const config = statusConfig[status] || statusConfig.upcoming;
    return (
        <Chip
            icon={config.icon}
            size="small"
            label={config.label}
            color={config.color}
            variant={status === 'upcoming' ? 'outlined' : 'filled'}
            sx={{ fontWeight: 700, minWidth: 85 }}
        />
    );
});


const MemoizedStyledDataGrid = React.memo(function MemoizedStyledDataGrid({
    satellitePasses,
    passesLoading,
    columnVisibility,
    onColumnVisibilityChange,
    pageSize = 15,
    onPageSizeChange,
    sortModel,
    onSortModelChange
}) {
    const apiRef = useGridApiRef();
    const { t, i18n } = useTranslation('target');
    const theme = useTheme();
    const isCompactView = useMediaQuery(theme.breakpoints.down('md'));
    const currentLanguage = i18n.language;
    const dataGridLocale = currentLanguage === 'el' ? elGR : enUS;
    const [page, setPage] = useState(0);
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);


    const now = useMemo(() => new Date(nowMs), [nowMs]);

    const columns = [
        {
            field: 'status',
            minWidth: 100,
            headerName: 'Status',
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            valueGetter: (_value, row) => getPassStatus(row, now),
            sortComparator: (v1, v2) => getPassStatusPriority(v1) - getPassStatusPriority(v2),
            renderCell: (params) => <PassStatusCell status={params.value} />
        },
        {
            field: 'event_start',
            minWidth: 160,
            headerName: t('next_passes.start'),
            flex: 1,
            renderCell: (params) => <TimeFormatter value={params.value} nowMs={nowMs} />
        },
        {
            field: 'event_end',
            minWidth: 160,
            headerName: t('next_passes.end'),
            flex: 1,
            renderCell: (params) => <TimeFormatter value={params.value} nowMs={nowMs} />
        },
        {
            field: 'duration',
            minWidth: 100,
            headerName: t('next_passes.duration'),
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <div>
                    <DurationFormatter params={params} event_start={params.row.event_start} event_end={params.row.event_end} nowMs={nowMs}/>
                </div>
            ),
        },
        {
            field: 'progress',
            minWidth: 120,
            headerName: t('next_passes.progress'),
            align: 'center',
            headerAlign: 'center',
            flex: 1.5,
            renderCell: (params) => <ProgressFormatter params={params} />
        },
        {
            field: 'distance_at_start',
            minWidth: 100,
            headerName: t('next_passes.distance_aos'),
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            valueFormatter: (value) => {
                return `${parseFloat(value).toFixed(2)} km`
            }
        },
        {
            field: 'distance_at_end',
            minWidth: 100,
            headerName: t('next_passes.distance_los'),
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            valueFormatter: (value) => {
                return `${parseFloat(value).toFixed(2)} km`
            }
        },
        {
            field: 'distance_at_peak',
            minWidth: 100,
            headerName: t('next_passes.distance_peak'),
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            valueFormatter: (value) => {
                return `${parseFloat(value).toFixed(2)} km`
            }
        },
        {
            field: 'peak_altitude',
            minWidth: 100,
            headerName: t('next_passes.max_el'),
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            valueFormatter: (value) => {
                return `${parseFloat(value).toFixed(2)}°`;
            },
            cellClassName: (params) => {
                if (params.value < 10.0) {
                    return "passes-cell-warning";
                } else if (params.value > 45.0) {
                    return "passes-cell-success";
                }
            }
        },
        {
            field: 'is_geostationary',
            minWidth: 70,
            headerName: t('next_passes.geo_stat'),
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            valueFormatter: (value) => {
                return value ? 'Yes' : 'No';
            },
            hide: true,
        },
        {
            field: 'is_geosynchronous',
            minWidth: 70,
            headerName: t('next_passes.geo_sync'),
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            valueFormatter: (value) => {
                return value ? 'Yes' : 'No';
            },
            hide: true,
        },
    ];

    const effectiveColumnVisibility = useMemo(() => {
        const base = {
            status: true,
            ...columnVisibility,
        };
        if (!isCompactView) return base;
        return {
            ...base,
            event_end: false,
            distance_at_start: false,
            distance_at_end: false,
            distance_at_peak: false,
            is_geostationary: false,
            is_geosynchronous: false,
        };
    }, [columnVisibility, isCompactView]);

    return (
        <StyledDataGrid
            apiRef={apiRef}
            fullWidth={true}
            loading={passesLoading}
            localeText={{
                ...dataGridLocale.components.MuiDataGrid.defaultProps.localeText,
                noRowsLabel: t('next_passes.no_satellite_selected')
            }}
            sx={{
                border: 0,
                marginTop: 0,
                [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: {
                    outline: 'none',
                },
                [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]:
                    {
                        outline: 'none',
                    },
                '& .MuiDataGrid-overlay': {
                    fontSize: '0.875rem',
                    fontStyle: 'italic',
                    color: 'text.secondary',
                },
            }}
            getRowClassName={(param) => {
                if (param.row) {
                    const status = getPassStatus(param.row, now);
                    if (status === 'passed') return "passes-row-passed passes-cell-passed pointer-cursor";
                    if (status === 'live') return "passes-row-live passes-cell-passing pointer-cursor";
                    return "pointer-cursor";
                }
                return "pointer-cursor";
            }}
            density={"compact"}
            rows={satellitePasses}
            pageSizeOptions={[5, 10, 15, 20]}
            columnVisibilityModel={effectiveColumnVisibility}
            onColumnVisibilityModelChange={onColumnVisibilityChange}
            sortModel={sortModel}
            onSortModelChange={onSortModelChange}
            paginationModel={{
                pageSize: pageSize,
                page: page,
            }}
            onPaginationModelChange={(model) => {
                setPage(model.page);
                if (onPageSizeChange && model.pageSize !== pageSize) {
                    onPageSizeChange(model.pageSize);
                }
            }}
            columns={columns}
            pinnedColumns={isCompactView ? { left: ['event_start'], right: ['progress'] } : { left: ['status', 'event_start'], right: ['progress'] }}
            disableRowSelectionOnClick
        />
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.satellitePasses === nextProps.satellitePasses &&
        prevProps.passesLoading === nextProps.passesLoading &&
        prevProps.columnVisibility === nextProps.columnVisibility &&
        prevProps.pageSize === nextProps.pageSize &&
        prevProps.sortModel === nextProps.sortModel
    );
});


const NextPassesIsland = React.memo(function NextPassesIsland() {
    const {socket} = useSocket();
    const dispatch = useDispatch();
    const { t } = useTranslation('target');
    const [containerHeight, setContainerHeight] = useState(0);
    const containerRef = useRef(null);
    const {
        passesLoading,
        satellitePasses,
        satelliteData,
        nextPassesHours,
        satelliteId,
        gridEditable,
        passesTableColumnVisibility,
        passesTablePageSize,
        passesTableSortModel,
        openPassesTableSettingsDialog
    } = useSelector(state => state.targetSatTrack);
    const { location } = useSelector(state => state.location);
    const minHeight = 200;
    const maxHeight = 400;
    const hasLoadedFromStorageRef = useRef(false);
    const isLoadingRef = useRef(false);
    const [quickFilterPreset, setQuickFilterPreset] = useState('all');
    const [filterNowMs, setFilterNowMs] = useState(() => Date.now());

    // Load column visibility from localStorage on mount
    useEffect(() => {
        // Prevent double loading (React StrictMode or component remounting)
        if (isLoadingRef.current || hasLoadedFromStorageRef.current) {
            return;
        }

        isLoadingRef.current = true;

        const loadColumnVisibility = () => {
            try {
                const stored = localStorage.getItem('target-passes-table-column-visibility');
                if (stored) {
                    const parsedVisibility = JSON.parse(stored);
                    dispatch(setPassesTableColumnVisibility(parsedVisibility));
                }
            } catch (e) {
                console.error('Failed to load target passes table column visibility:', e);
            } finally {
                hasLoadedFromStorageRef.current = true;
                isLoadingRef.current = false;
            }
        };
        loadColumnVisibility();
    }, []);

    // Persist column visibility to localStorage whenever it changes (but not on initial load)
    useEffect(() => {
        if (passesTableColumnVisibility && hasLoadedFromStorageRef.current) {
            try {
                localStorage.setItem('target-passes-table-column-visibility', JSON.stringify(passesTableColumnVisibility));
            } catch (e) {
                console.error('Failed to save target passes table column visibility:', e);
            }
        }
    }, [passesTableColumnVisibility]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setFilterNowMs(Date.now());
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const handleRefreshPasses = () => {
        if (satelliteId) {
            dispatch(fetchNextPasses({
                socket,
                noradId: satelliteId,
                hours: nextPassesHours,
                forceRecalculate: true
            }));
        }
    };

    // Calculate elevation curves when passes are received or satellite changes
    useEffect(() => {
        // Check if location is valid (not null)
        const isLocationValid = location && location.lat != null && location.lon != null;

        if (satellitePasses && satellitePasses.length > 0 && isLocationValid && satelliteData && satelliteData.details) {
            // Check if elevation curves need to be calculated (if any pass has empty elevation_curve)
            const needsCalculation = satellitePasses.some(pass => !pass.elevation_curve || pass.elevation_curve.length === 0);

            if (needsCalculation) {
                // Create satellite lookup from satelliteData
                const satelliteLookup = {
                    [satelliteData.details.norad_id]: {
                        norad_id: satelliteData.details.norad_id,
                        tle1: satelliteData.details.tle1,
                        tle2: satelliteData.details.tle2
                    }
                };

                // Calculate elevation curves in the background
                setTimeout(() => {
                    const passesWithCurves = calculateElevationCurvesForPasses(
                        satellitePasses,
                        { lat: location.lat, lon: location.lon },
                        satelliteLookup
                    );
                    dispatch(updateSatellitePassesWithElevationCurves(passesWithCurves));
                }, 0);
            }
        }
    }, [satellitePasses, location, satelliteData, satelliteId, dispatch]);

    useEffect(() => {
        const target = containerRef.current;
        const observer = new ResizeObserver((entries) => {
            setContainerHeight(entries[0].contentRect.height);
        });
        if (target) {
            observer.observe(target);
        }
        return () => {
            observer.disconnect();
        };
    }, [containerRef]);

    const handleColumnVisibilityChange = (newModel) => {
        dispatch(setPassesTableColumnVisibility(newModel));
    };

    const handlePageSizeChange = (newPageSize) => {
        dispatch(setPassesTablePageSize(newPageSize));
    };

    const handleSortModelChange = useCallback((newSortModel) => {
        dispatch(setPassesTableSortModel(newSortModel));
    }, [dispatch]);

    const handleOpenSettings = () => {
        dispatch(setOpenPassesTableSettingsDialog(true));
    };

    const handleCloseSettings = () => {
        dispatch(setOpenPassesTableSettingsDialog(false));
    };

    const applyDefaultSort = useCallback(() => {
        dispatch(setPassesTableSortModel([
            { field: 'status', sort: 'asc' },
            { field: 'event_start', sort: 'asc' },
        ]));
    }, [dispatch]);

    const filteredPasses = useMemo(() => {
        const now = new Date(filterNowMs);
        if (quickFilterPreset === 'live') {
            return satellitePasses.filter((pass) => getPassStatus(pass, now) === 'live');
        }
        if (quickFilterPreset === 'next30') {
            return satellitePasses.filter((pass) => {
                const status = getPassStatus(pass, now);
                if (status === 'live') return true;
                if (status !== 'upcoming') return false;
                return (new Date(pass.event_start) - now) <= 30 * 60 * 1000;
            });
        }
        return satellitePasses;
    }, [satellitePasses, quickFilterPreset, filterNowMs]);

    const handleQuickPreset = useCallback((preset) => {
        setQuickFilterPreset(preset);
        if (preset === 'highEl') {
            dispatch(setPassesTableSortModel([
                { field: 'peak_altitude', sort: 'desc' },
                { field: 'event_start', sort: 'asc' },
            ]));
            return;
        }
        applyDefaultSort();
    }, [dispatch, applyDefaultSort]);

    useEffect(() => {
        const handleKeyboardShortcuts = (event) => {
            if (!event.altKey) return;
            if (event.key === '1') handleQuickPreset('all');
            else if (event.key === '2') handleQuickPreset('live');
            else if (event.key === '3') handleQuickPreset('next30');
            else if (event.key === '4') handleQuickPreset('highEl');
            else return;
            event.preventDefault();
        };
        window.addEventListener('keydown', handleKeyboardShortcuts);
        return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
    }, [handleQuickPreset]);

    return (
        <>
            <TitleBar
                className={getClassNamesBasedOnGridEditing(gridEditable, ["window-title-bar"])}
                sx={{
                    bgcolor: 'background.titleBar',
                    borderBottom: '1px solid',
                    borderColor: 'border.main',
                    backdropFilter: 'blur(10px)',
                    height: 30,
                    minHeight: 30,
                    py: 0,
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '100%'}}>
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                        <Typography variant="subtitle2" sx={{fontWeight: 'bold'}}>
                            {t('next_passes.title', { name: satelliteData['details']['name'], hours: nextPassesHours })}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Tooltip title="Alt+1">
                            <span>
                                <Button size="small" variant={quickFilterPreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleQuickPreset('all')} sx={{ minHeight: 24, height: 24, py: 0, px: 1, lineHeight: 1.1, fontSize: '0.72rem' }}>
                                    All
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Alt+2">
                            <span>
                                <Button size="small" variant={quickFilterPreset === 'live' ? 'contained' : 'outlined'} onClick={() => handleQuickPreset('live')} sx={{ minHeight: 24, height: 24, py: 0, px: 1, lineHeight: 1.1, fontSize: '0.72rem' }}>
                                    Live
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Alt+3">
                            <span>
                                <Button size="small" variant={quickFilterPreset === 'next30' ? 'contained' : 'outlined'} onClick={() => handleQuickPreset('next30')} sx={{ minHeight: 24, height: 24, py: 0, px: 1, lineHeight: 1.1, fontSize: '0.72rem' }}>
                                    Next 30m
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Alt+4">
                            <span>
                                <Button size="small" variant={quickFilterPreset === 'highEl' ? 'contained' : 'outlined'} onClick={() => handleQuickPreset('highEl')} sx={{ minHeight: 24, height: 24, py: 0, px: 1, lineHeight: 1.1, fontSize: '0.72rem' }}>
                                    High El
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title={t('passes_table_settings.title')}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={handleOpenSettings}
                                    sx={{ padding: '2px' }}
                                >
                                    <SettingsIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Refresh passes (force recalculate)">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={handleRefreshPasses}
                                    disabled={passesLoading || !satelliteId}
                                    sx={{ padding: '2px' }}
                                >
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>
            </TitleBar>
            <div style={{ position: 'relative', display: 'block', height: '100%' }} ref={containerRef}>
                <div style={{
                    padding:'0rem 0rem 0rem 0rem',
                    display: 'flex',
                    flexDirection: 'column',
                    height: containerHeight - 25,
                    minHeight,
                }}>
                    <MemoizedStyledDataGrid
                        satellitePasses={filteredPasses}
                        passesLoading={passesLoading}
                        columnVisibility={passesTableColumnVisibility}
                        onColumnVisibilityChange={handleColumnVisibilityChange}
                        pageSize={passesTablePageSize}
                        onPageSizeChange={handlePageSizeChange}
                        sortModel={passesTableSortModel}
                        onSortModelChange={handleSortModelChange}
                    />
                </div>
            </div>
            <TargetPassesTableSettingsDialog
                open={openPassesTableSettingsDialog}
                onClose={handleCloseSettings}
            />
        </>
    );
});

export default NextPassesIsland;
