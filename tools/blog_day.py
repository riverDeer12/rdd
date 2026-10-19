#!/usr/bin/env python3
"""
RDD Software - which day of the week gets a new blog article.

One article a week, on a day that changes from week to week (Monday one
week, Friday the next, Sunday after that). The day is drawn from the
year and week number, so it is random-looking but fixed: running this
again on the same day always gives the same answer.

    python3 tools/blog_day.py           prints "yes" if today is the day, otherwise "no"
    python3 tools/blog_day.py --next    when the next article is due, after today, as
                                        an RFC 3339 UTC time (06:58 in Croatia); the
                                        weekly blog routine schedules its next run with it
    python3 tools/blog_day.py --plan    the days for the next 52 weeks

"Today" is the date in Croatia (Europe/Zagreb).
"""

import datetime
import hashlib
import sys
from zoneinfo import ZoneInfo

DAYS_HR = ['ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota', 'nedjelja']


def article_day(day):
    """The date in day's ISO week on which the article is written."""
    year, week, _ = day.isocalendar()
    digest = hashlib.sha256(('rdd-blog-%d-%02d' % (year, week)).encode()).digest()
    weekday = digest[0] % 7                       # 0 = Monday
    return datetime.date.fromisocalendar(year, week, weekday + 1)


ZAGREB = ZoneInfo('Europe/Zagreb')
RUN_AT = datetime.time(6, 58)          # local time the routine starts writing


def next_article_day(today):
    """The first article day after today."""
    monday = today - datetime.timedelta(days=today.weekday())
    for week in range(3):
        day = article_day(monday + datetime.timedelta(weeks=week))
        if day > today:
            return day


def main():
    today = datetime.datetime.now(ZAGREB).date()
    if '--next' in sys.argv:
        local = datetime.datetime.combine(next_article_day(today), RUN_AT, tzinfo=ZAGREB)
        print(local.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:00Z'))
        return
    if '--plan' in sys.argv:
        monday = today - datetime.timedelta(days=today.weekday())
        for i in range(52):
            day = article_day(monday + datetime.timedelta(weeks=i))
            print('%s  %s' % (day.isoformat(), DAYS_HR[day.weekday()]))
        return
    print('yes' if article_day(today) == today else 'no')


if __name__ == '__main__':
    main()
