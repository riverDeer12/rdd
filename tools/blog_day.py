#!/usr/bin/env python3
"""
RDD Software - which day of the week gets a new blog article.

One article a week, on a day that changes from week to week (Monday one
week, Friday the next, Sunday after that). The day is drawn from the
year and week number, so it is random-looking but fixed: running this
again on the same day always gives the same answer.

    python3 tools/blog_day.py          prints "yes" if today is the day, otherwise "no"
    python3 tools/blog_day.py --plan   the days for the next 8 weeks

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


def main():
    today = datetime.datetime.now(ZoneInfo('Europe/Zagreb')).date()
    if '--plan' in sys.argv:
        monday = today - datetime.timedelta(days=today.weekday())
        for i in range(8):
            day = article_day(monday + datetime.timedelta(weeks=i))
            print('%s  %s' % (day.isoformat(), DAYS_HR[day.weekday()]))
        return
    print('yes' if article_day(today) == today else 'no')


if __name__ == '__main__':
    main()
