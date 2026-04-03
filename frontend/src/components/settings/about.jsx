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

import React from 'react';
import { useSelector } from 'react-redux';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Link,
    Paper,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import RadioIcon from '@mui/icons-material/Radio';
import ImageIcon from '@mui/icons-material/Image';
import DevicesIcon from '@mui/icons-material/Devices';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import WebIcon from '@mui/icons-material/Web';
import InfoIcon from '@mui/icons-material/Info';
import MemoryIcon from '@mui/icons-material/Memory';
import ComputerIcon from '@mui/icons-material/Computer';
import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { GroundStationLogoGreenBlue } from '../common/dataurl-icons.jsx';

const AboutPage = () => {
    const theme = useTheme();
    const { t } = useTranslation('settings');
    const versionInfo = useSelector((state) => state.version?.data);

    const featureItems = [
        {
            text: 'Real-time Satellite Tracking: Track hundreds of satellites with high-precision orbital models. TLE data is automatically updated from CelesTrak and SatNOGS.',
            icon: <SatelliteAltIcon fontSize="small" color="primary" />,
        },
        {
            text: 'Automated Antenna Rotator Control: Interface with popular antenna rotators to automatically track satellites as they pass overhead.',
            icon: <SettingsInputAntennaIcon fontSize="small" color="primary" />,
        },
        {
            text: 'SDR Integration: Stream and record live radio signals from a wide range of SDR devices, including RTL-SDR, SoapySDR, and UHD/USRP radios.',
            icon: <RadioIcon fontSize="small" color="primary" />,
        },
        {
            text: 'IQ Recording and Playback: Record raw IQ data in SigMF format with complete metadata and replay recordings through a virtual SDR device for analysis.',
            icon: <StorageIcon fontSize="small" color="primary" />,
        },
        {
            text: 'Data Decoding: Decode SSTV, FSK, GFSK, GMSK, and BPSK with AX25 USP Geoscan framing.',
            icon: <ImageIcon fontSize="small" color="primary" />,
        },
        {
            text: 'AI-Powered Transcription: Real-time speech-to-text for demodulated audio via Gemini Live or Deepgram, with optional translation and output storage.',
            icon: <MemoryIcon fontSize="small" color="primary" />,
        },
        {
            text: 'Scheduled Observations: Define observation tasks that automatically listen, decode, transcribe, and record during satellite passes.',
            icon: <SatelliteAltIcon fontSize="small" color="primary" />,
        },
        {
            text: 'SatDump Integration: Decode weather satellite images from METEOR-M2 (LRPT and HRPT) via SatDump workflows.',
            icon: <ImageIcon fontSize="small" color="primary" />,
        },
        {
            text: 'Performance Monitoring: Visualize signal processing flow, queue health, throughput, and component statistics.',
            icon: <ComputerIcon fontSize="small" color="primary" />,
        },
        {
            text: 'Responsive Web Interface: Control the full station from desktop, tablet, or phone through a unified web interface.',
            icon: <DevicesIcon fontSize="small" color="primary" />,
        },
    ];

    const plannedFeatures = [
        { text: 'Additional Decoders: AFSK packet decoder.', icon: <SatelliteAltIcon fontSize="small" color="secondary" /> },
        { text: 'Additional Decoders: LoRa decoders.', icon: <RadioIcon fontSize="small" color="secondary" /> },
        { text: 'Additional Decoders: NOAA APT weather satellite images.', icon: <ImageIcon fontSize="small" color="secondary" /> },
        { text: 'Additional Decoders: Additional telemetry formats.', icon: <CodeIcon fontSize="small" color="secondary" /> },
    ];

    const backendTechnologies = [
        { name: 'FastAPI', description: 'A fast Python web framework for API services.', url: 'https://fastapi.tiangolo.com/' },
        { name: 'SQLAlchemy', description: 'Python SQL toolkit and ORM.', url: 'https://www.sqlalchemy.org/' },
        { name: 'Skyfield', description: 'Astronomy library for orbital and celestial positions.', url: 'https://rhodesmill.org/skyfield/' },
        { name: 'SGP4', description: 'Satellite propagation model implementation.', url: 'https://pypi.org/project/sgp4/' },
        { name: 'Socket.IO', description: 'Realtime bidirectional communication library.', url: 'https://python-socketio.readthedocs.io/en/latest/' },
        { name: 'pyrtlsdr', description: 'Python wrapper for RTL-SDR.', url: 'https://pypi.org/project/pyrtlsdr/' },
        { name: 'SoapySDR', description: 'Vendor-neutral SDR support library.', url: 'https://pypi.org/project/SoapySDR/' },
        { name: 'SatDump', description: 'Satellite decoder suite for weather image workflows.', url: 'https://github.com/SatDump/SatDump' },
        { name: 'gr-satellites', description: 'GNU Radio modules for satellite communications.', url: 'https://github.com/daniestevez/gr-satellites' },
    ];

    const frontendTechnologies = [
        { name: 'React', description: 'UI library for component-based interfaces.', url: 'https://reactjs.org/' },
        { name: 'Redux Toolkit', description: 'Opinionated Redux tooling for state management.', url: 'https://redux-toolkit.js.org/' },
        { name: 'Material-UI', description: 'UI component framework for React.', url: 'https://mui.com/' },
        { name: 'Vite', description: 'Fast frontend bundler and dev server.', url: 'https://vitejs.dev/' },
        { name: 'Socket.IO Client', description: 'Client runtime for realtime Socket.IO communications.', url: 'https://socket.io/docs/v4/client-api/' },
        { name: 'Leaflet', description: 'Interactive map library.', url: 'https://leafletjs.com/' },
        { name: 'satellite.js', description: 'JavaScript library for orbit propagation.', url: 'https://github.com/shashwatak/satellite-js' },
    ];

    const sdrSupport = [
        'RTL-SDR (USB or rtl_tcp) workers',
        'SoapySDR devices locally or through SoapyRemote (Airspy, HackRF, LimeSDR, etc.)',
        'UHD/USRP radios via a UHD worker',
    ];

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 0 }}>
            <Stack spacing={2}>
                <Card elevation={1} sx={{ p: 2 }}>
                    <Grid container spacing={2} columns={12} alignItems="center">
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <img src={GroundStationLogoGreenBlue} alt="Ground Station Logo" style={{ height: '56px', width: 'auto' }} />
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                        Ground Station
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('about.intro', { defaultValue: 'Open-source software platform for satellite tracking, SDR operations, and automated observation workflows.' })}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<GitHubIcon />}
                                    endIcon={<OpenInNewIcon fontSize="small" />}
                                    component={Link}
                                    href="https://github.com/sgoudelis/ground-station"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={t('about.repo_link_aria', { defaultValue: 'Open Ground Station GitHub repository in a new tab' })}
                                    underline="none"
                                >
                                    {t('about.repo', { defaultValue: 'Repository' })}
                                </Button>
                                <Button
                                    variant="text"
                                    component={Link}
                                    href="https://github.com/sgoudelis/ground-station/blob/main/LICENSE"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={t('about.license_link_aria', { defaultValue: 'Open project license in a new tab' })}
                                    underline="hover"
                                >
                                    {t('about.license', { defaultValue: 'GPL-3.0 License' })}
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>

                    {versionInfo && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                            {versionInfo.version && <Chip size="small" color="primary" label={`v${versionInfo.version}`} />}
                            {versionInfo.environment && (
                                <Chip
                                    size="small"
                                    color={versionInfo.environment === 'production' ? 'success' : 'warning'}
                                    label={versionInfo.environment}
                                    sx={{ textTransform: 'capitalize' }}
                                />
                            )}
                            {versionInfo.buildDate && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${t('about.build', { defaultValue: 'Build' })}: ${versionInfo.buildDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}`}
                                />
                            )}
                            {versionInfo.gitCommit && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace' }}
                                    label={`${t('about.commit', { defaultValue: 'Commit' })}: ${versionInfo.gitCommit}`}
                                />
                            )}
                            {versionInfo.system?.cpu?.architecture && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${t('about.arch', { defaultValue: 'Arch' })}: ${versionInfo.system.cpu.architecture}`}
                                />
                            )}
                        </Stack>
                    )}
                </Card>

                <Grid container spacing={2} columns={12}>
                    <Grid size={{ xs: 12, lg: 7 }}>
                        <Card elevation={1} sx={{ p: 2, height: '100%' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {t('about.features_title', { defaultValue: 'Key Features' })}
                            </Typography>
                            <Divider sx={{ my: 1.5 }} />
                            <Stack spacing={1.2}>
                                {featureItems.map((feature, index) => (
                                    <Stack key={index} direction="row" spacing={1.25} alignItems="flex-start">
                                        <Box sx={{ mt: 0.2 }}>{feature.icon}</Box>
                                        <Typography variant="body2">{feature.text}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 5 }}>
                        <Stack spacing={2}>
                            <Card elevation={1} sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                    {t('about.roadmap_title', { defaultValue: 'Roadmap' })}
                                </Typography>
                                <Divider sx={{ my: 1.5 }} />
                                <Stack spacing={1.2}>
                                    {plannedFeatures.map((feature, index) => (
                                        <Stack key={index} direction="row" spacing={1.25} alignItems="center">
                                            {feature.icon}
                                            <Typography variant="body2">{feature.text}</Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Card>

                            <Card elevation={1} sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    {t('about.sdr_support_title', { defaultValue: 'SDR Device Support' })}
                                </Typography>
                                <Divider sx={{ my: 1.5 }} />
                                <Stack spacing={1.2}>
                                    {sdrSupport.map((device, index) => (
                                        <Stack key={index} direction="row" spacing={1.25} alignItems="center">
                                            <RadioIcon fontSize="small" color="secondary" />
                                            <Typography variant="body2">{device}</Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Card>
                        </Stack>
                    </Grid>
                </Grid>

                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {t('about.architecture_title', { defaultValue: 'System Architecture' })}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Stack spacing={1.2}>
                            <Typography variant="body2">
                                <strong>{t('about.frontend_label', { defaultValue: 'Frontend' })}:</strong>{' '}
                                {t('about.frontend_desc', { defaultValue: 'React single-page application with Redux Toolkit and Material UI, connected to backend through Socket.IO for real-time updates.' })}
                            </Typography>
                            <Typography variant="body2">
                                <strong>{t('about.backend_label', { defaultValue: 'Backend' })}:</strong>{' '}
                                {t('about.backend_desc', { defaultValue: 'Python/FastAPI service exposing REST and Socket.IO endpoints and orchestrating station workers.' })}
                            </Typography>
                            <Typography variant="body2">
                                <strong>{t('about.workers_label', { defaultValue: 'Workers' })}:</strong>{' '}
                                {t('about.workers_desc', { defaultValue: 'Dedicated worker processes for tracking, hardware control, SDR streaming, and discovery tasks.' })}
                            </Typography>
                        </Stack>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {t('about.technologies_title', { defaultValue: 'Third-Party Libraries and Technologies' })}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2} columns={12}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Card variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <StorageIcon fontSize="small" color="primary" />
                                        {t('about.backend_stack', { defaultValue: 'Backend Stack' })}
                                    </Typography>
                                    <Divider sx={{ my: 1 }} />
                                    <Stack spacing={1}>
                                        {backendTechnologies.map((tech) => (
                                            <Box key={tech.name}>
                                                <Link
                                                    href={tech.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`${tech.name} (opens in new tab)`}
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {tech.name}
                                                </Link>
                                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                                    {tech.description}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Card>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Card variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <WebIcon fontSize="small" color="secondary" />
                                        {t('about.frontend_stack', { defaultValue: 'Frontend Stack' })}
                                    </Typography>
                                    <Divider sx={{ my: 1 }} />
                                    <Stack spacing={1}>
                                        {frontendTechnologies.map((tech) => (
                                            <Box key={tech.name}>
                                                <Link
                                                    href={tech.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`${tech.name} (opens in new tab)`}
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {tech.name}
                                                </Link>
                                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                                    {tech.description}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Card>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                <Card elevation={1} sx={{ p: 2, border: `1px solid ${theme.palette.info.main}33` }}>
                    <Stack direction="row" spacing={1.25} alignItems="flex-start">
                        <InfoIcon fontSize="small" color="info" sx={{ mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary">
                            <strong>{t('about.note_label', { defaultValue: 'Note' })}:</strong>{' '}
                            {t('about.note_text', { defaultValue: 'The FM, AM, and SSB demodulator implementations were developed with assistance from Claude AI (Anthropic). These sections are marked in source and licensed under GPL-3.0 like the rest of the project.' })}
                        </Typography>
                    </Stack>
                </Card>
            </Stack>
        </Paper>
    );
};

export default AboutPage;
