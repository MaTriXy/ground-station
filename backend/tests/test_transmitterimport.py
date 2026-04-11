# Copyright (c) 2025 Efstratios Goudelis
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

import datetime as dt
import uuid

import pytest
from sqlalchemy import text

from crud.satellites import add_satellite
from handlers.entities.transmitterimport import build_satdump_rows, upsert_transmitters

TLE1_TEMPLATE = "1 {norad:05d}U 00000A   21001.00000000  .00000000  00000-0  00000-0 0  9990"
TLE2_TEMPLATE = "2 {norad:05d}  51.0000 000.0000 0000000   0.0000   0.0000 15.00000000000000"


@pytest.mark.asyncio
class TestTransmitterImport:
    async def test_build_satdump_rows_sets_itu_notification_as_object(self):
        satellites = [
            {
                "sat": {"name": "TEST SAT", "norad": 25544},
                "rows": [["name", "unused", "437.800 MHz"], ["Beacon", "unused", "437.825 MHz"]],
            }
        ]
        rows, skipped_missing_sat, skipped_no_frequency = build_satdump_rows(
            satellites=satellites,
            satellites_in_db={25544},
            source="satdump",
            citation="https://example.test",
        )

        assert skipped_missing_sat == []
        assert skipped_no_frequency == []
        assert rows[0]["itu_notification"] == {"urls": []}

    async def test_upsert_transmitters_normalizes_escaped_itu_notification(self, db_session):
        await add_satellite(
            db_session,
            {
                "name": "Test Satellite",
                "sat_id": "TEST-001",
                "norad_id": 25544,
                "status": "alive",
                "is_frequency_violator": False,
                "tle1": TLE1_TEMPLATE.format(norad=25544),
                "tle2": TLE2_TEMPLATE.format(norad=25544),
            },
        )

        row = {
            "id": str(uuid.uuid4()),
            "norad_cat_id": 25544,
            "status": "active",
            "source": "satdump",
            "added": dt.datetime.now(dt.timezone.utc),
            "updated": dt.datetime.now(dt.timezone.utc),
            "itu_notification": '"{\\\\"urls\\\\": []}"',
        }
        await upsert_transmitters([row], session=db_session)

        stored = await db_session.execute(
            text(
                "SELECT json_valid(itu_notification), json_extract(itu_notification, '$.urls') "
                "FROM transmitters WHERE id = :id"
            ),
            {"id": row["id"]},
        )
        json_valid, urls = stored.one()
        assert json_valid == 1
        assert urls == "[]"
