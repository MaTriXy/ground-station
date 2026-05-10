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
import {
    Box,
    Tab,
    Button,
    Alert,
    AlertTitle, Typography
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import Paper from "@mui/material/Paper";
import Tabs, { tabsClasses } from '@mui/material/Tabs';
import {gridLayoutStoreName as overviewGridLayoutName} from '../overview/main-layout.jsx';
import {gridLayoutStoreName as targetGridLayoutName} from '../target/main-layout.jsx';
import Grid from "@mui/material/Grid";
import AntennaRotatorTable from "../hardware/rotator-table.jsx";
import RigTable from "../hardware/rig-table.jsx";
import {styled} from "@mui/material/styles";
import SourcesTable from "../satellites/sources-table.jsx";
import SatelliteTable from "../satellites/satellite-table.jsx";
import AboutPage from "./about.jsx";
import SatelliteGroupsTable from "../satellites/groups-table.jsx";
import LocationPage from "./location-form.jsx";
import PreferencesForm from "./preferences-form.jsx";
import MaintenanceForm from "./maintenance-form.jsx";
import CameraTable from "../hardware/camera-table.jsx";
import {AntTab, AntTabs} from "../common/common.jsx";
import SDRsPage from "../hardware/sdr-table.jsx";
import AppSettingsForm from "./app-settings-form.jsx";


export function SettingsTabSatellites() {
    return (<SettingsTabs initialMainTab={"satellites"} initialTab={"satellites"}/>);
}

export function SettingsTabOrbitalSources() {
    return (<SettingsTabs initialMainTab={"satellites"} initialTab={"orbitalsources"}/>);
}

export const SettingsTabTLESources = SettingsTabOrbitalSources;

export function SettingsTabSatelliteGroups() {
    return (<SettingsTabs initialMainTab={"satellites"} initialTab={"groups"}/>);
}

export function SettingsTabPreferences() {
    return (
        <SettingsTabs
            initialMainTab={"settings"}
            initialTab={"settings"}
            initialSettingsSubTab={"preferences"}
        />
    );
}

export function SettingsTabSettings() {
    return (
        <SettingsTabs
            initialMainTab={"settings"}
            initialTab={"settings"}
            initialSettingsSubTab={"settings"}
        />
    );
}

export function SettingsTabLocation() {
    return (<SettingsTabs initialMainTab={"settings"} initialTab={"location"}/>);
}

export function SettingsTabRig() {
    return (<SettingsTabs initialMainTab={"hardware"} initialTab={"rigcontrol"}/>);
}

export function SettingsTabRotator() {
    return (<SettingsTabs initialMainTab={"hardware"} initialTab={"rotatorcontrol"}/>);
}

export function SettingsTabCamera() {
    return (<SettingsTabs initialMainTab={"hardware"} initialTab={"camera"}/>);
}

export function SettingsTabSDR() {
    return (<SettingsTabs initialMainTab={"hardware"} initialTab={"sdrs"}/>);
}

export function SettingsTabMaintenance () {
    return (<SettingsTabs initialMainTab={"settings"} initialTab={"maintenance"}/>);
}


export function SettingsTabAbout () {
    return (<SettingsTabs initialMainTab={"settings"} initialTab={"about"}/>);
}

const tabsTree = {
    "hardware": ["rigcontrol", "rotatorcontrol", /* "camera", */ "sdrs"],
    "satellites": ["satellites", "orbitalsources", "groups"],
    "settings": ["settings", "location", "maintenance", "users", "about"],
};

function getTabCategory(value) {
    for (const [key, values] of Object.entries(tabsTree)) {
        if (values.includes(value)) {
            return key;
        }
    }
    return null;
}

export const SettingsTabs = React.memo(function SettingsTabs({
    initialMainTab,
    initialTab,
    initialSettingsSubTab = "settings",
}) {
    const { t } = useTranslation('settings');
    const location = useLocation();

    const getTabFromPath = (pathname) => {
        switch (pathname) {
            case "/hardware/rig":
                return "rigcontrol";
            case "/hardware/rotator":
                return "rotatorcontrol";
            case "/hardware/cameras":
                return "camera";
            case "/hardware/sdrs":
                return "sdrs";
            case "/satellites/orbital-sources":
                return "orbitalsources";
            case "/satellites/tlesources":
                return "orbitalsources";
            case "/satellites/satellites":
                return "satellites";
            case "/satellites/groups":
                return "groups";
            case "/settings/settings":
                return "settings";
            case "/settings/preferences":
                return "settings";
            case "/settings/location":
                return "location";
            case "/settings/maintenance":
                return "maintenance";
            case "/settings/about":
                return "about";
            default:
                return initialTab;
        }
    };

    const activeTab = getTabFromPath(location.pathname);
    const activeMainTab = getTabCategory(activeTab) ?? initialMainTab;

    let tabsList = [];
    // Define arrays of tabs for each main category
    switch (activeMainTab) {
        case "hardware":
            tabsList = [
                <AntTab key="rigcontrol" value="rigcontrol" label={t('tabs.rigs')} to="/hardware/rig" component={Link} />,
                <AntTab key="rotatorcontrol" value="rotatorcontrol" label={t('tabs.rotators')} to="/hardware/rotator" component={Link} />,
                // <AntTab key="camera" value="camera" label={t('tabs.cameras')} to="/hardware/cameras" component={Link} />,
                <AntTab key="sdrs" value="sdrs" label={t('tabs.sdrs')} to="/hardware/sdrs" component={Link}/>,
            ];
            break;
        case "satellites":
            tabsList = [
                <AntTab key="orbitalsources" value="orbitalsources" label={t('tabs.orbital_sources')} to="/satellites/orbital-sources" component={Link} />,
                <AntTab key="satellites" value="satellites" label={t('tabs.satellite_list')} to="/satellites/satellites" component={Link} />,
                <AntTab key="groups" value="groups" label={t('tabs.groups')} to="/satellites/groups" component={Link} />,
            ];
            break;
        case "settings":
            tabsList = [
                <AntTab key="settings" value="settings" label={t('tabs.settings')} to="/settings/settings" component={Link} />,
                <AntTab key="location" value="location" label={t('tabs.location')} to="/settings/location" component={Link} />,
                // <AntTab key="users" value="users" label="Users" to="/settings/users" component={Link} />,
                <AntTab key="maintenance" value="maintenance" label={t('tabs.maintenance')} to="/settings/maintenance" component={Link} />,
                <AntTab key="about" value="about" label={t('tabs.about')} to="/settings/about" component={Link} />,
            ];
            break;
        default:
            console.log("Unknown main tab: " + activeMainTab);
    }

    const tabObject = <AntTabs
        sx={{
            [`& .${tabsClasses.scrollButtons}`]: {
                '&.Mui-disabled': { opacity: 0.3 },
            },
        }}
        value={activeTab}
        aria-label={t('tabs.configuration_tabs')}
        scrollButtons={true}
        variant="scrollable"
        allowScrollButtonsMobile
    >
        {tabsList}
    </AntTabs>;

    let activeTabContent = null;

    switch (activeTab) {
        case "settings":
            activeTabContent = (
                <SettingsAndPreferencesForm
                    initialSubTab={location.pathname === "/settings/preferences" ? "preferences" : initialSettingsSubTab}
                />
            );
            break;
        case "location":
            activeTabContent = <LocationPage/>;
            break;
        case "rigcontrol":
            activeTabContent = <RigControlForm/>;
            break;
        case "rotatorcontrol":
            activeTabContent = <RotatorControlForm/>;
            break;
        // case "camera":
        //     activeTabContent = <CameraPage/>;
        //     break;
        case "sdrs":
            activeTabContent = <SDRsPage/>;
            break;
        case "orbitalsources":
            activeTabContent = <OrbitalSourcesForm/>;
            break;
        case "satellites":
            activeTabContent = <SatellitesForm/>;
            break;
        case "groups":
            activeTabContent = <SatelliteGroupsForm/>;
            break;
        case "maintenance":
            activeTabContent = <MaintenanceForm/>;
            break;
        case "about":
            activeTabContent = <AboutPage/>;
            break;
        default:
            break;
    }

    return (
         <Box sx={{ flexGrow: 1, bgcolor: 'background.paper' }}>
             <AntTabs
                 sx={{
                     [`& .${tabsClasses.scrollButtons}`]: {
                         '&.Mui-disabled': { opacity: 0.3 },
                     },
                     bottomBorder: '1px #4c4c4c solid',
                 }}
                 value={activeMainTab}
                 aria-label={t('tabs.main_settings_tabs')}
                 scrollButtons={true}
                 variant="fullWidth"
                 allowScrollButtonsMobile
             >
                 <AntTab value={"hardware"} label={t('tabs.hardware')} to="/hardware/rig" component={Link}/>
                 <AntTab value={"satellites"} label={t('tabs.satellites')} to="/satellites/satellites" component={Link}/>
                 <AntTab value={"settings"} label={t('tabs.settings')} to="/settings/settings" component={Link}/>
             </AntTabs>
             {tabObject}
             {activeTabContent}
         </Box>
    );
});

const RotatorControlForm = () => {

    return (
        <AntennaRotatorTable/>
    );
};


const CameraPage = () => {

    return (
        <CameraTable/>
    );
};


const RigControlForm = () => {

    return (
        <RigTable/>
    );
};

const SatellitesForm = () => {

    return (
        <Paper elevation={3} sx={{ padding: 2, marginTop: 0, borderRadius: 0}} variant="elevation">
            <SatelliteTable/>
        </Paper>);
};

const SatelliteGroupsForm = () => {

    return (
        <Paper elevation={3} sx={{ padding: 2, marginTop: 0, borderRadius: 0}} variant="elevation">
            <SatelliteGroupsTable/>
        </Paper>);
};

const OrbitalSourcesForm = () => {

    return (
        <Paper elevation={3} sx={{ padding: 2, marginTop: 0, borderRadius: 0}} variant="elevation">
            <SourcesTable/>
        </Paper>);
};

const SettingsAndPreferencesForm = React.memo(function SettingsAndPreferencesForm({ initialSubTab }) {
    const { t } = useTranslation('settings');
    const location = useLocation();
    const navigate = useNavigate();

    const resolveSubTabFromPath = React.useCallback((pathname) => {
        return pathname === "/settings/preferences" ? "preferences" : "settings";
    }, []);

    const [activeSubTab, setActiveSubTab] = React.useState(() => initialSubTab || "settings");

    React.useEffect(() => {
        setActiveSubTab(resolveSubTabFromPath(location.pathname));
    }, [location.pathname, resolveSubTabFromPath]);

    React.useEffect(() => {
        if (!initialSubTab) {
            return;
        }
        setActiveSubTab(initialSubTab);
    }, [initialSubTab]);

    const handleTabChange = (_event, nextTab) => {
        if (nextTab === activeSubTab) {
            return;
        }

        const nextPath = nextTab === "preferences" ? "/settings/preferences" : "/settings/settings";
        navigate(nextPath);
    };

    return (
        <Box sx={{ flexGrow: 1, bgcolor: 'background.paper' }}>
            <AntTabs
                value={activeSubTab}
                onChange={handleTabChange}
                aria-label={t('tabs.configuration_tabs')}
                scrollButtons={true}
                variant="scrollable"
                allowScrollButtonsMobile
                sx={{
                    [`& .${tabsClasses.scrollButtons}`]: {
                        '&.Mui-disabled': { opacity: 0.3 },
                    },
                }}
            >
                <AntTab key="preferences" value="preferences" label={t('tabs.preferences')} />
                <AntTab key="settings" value="settings" label={t('tabs.settings')} />
            </AntTabs>
            {activeSubTab === "preferences" ? <PreferencesForm/> : <AppSettingsForm/>}
        </Box>
    );
});
