ALTER TABLE [NWKPI].[dbo].[towermtcdata]
DROP COLUMN [cumulative_count];

ALTER TABLE [NWKPI].[dbo].[towermtcdata]
ADD
    [Cumulative_Scheduled] INT NULL,
    [Cumulative_Attended] INT NULL;


Select * from towermtcdata;

--------------------- converting existing values ---------------------
;WITH CTE AS
(
    SELECT
        id,
        designation,
        [year],
        [month],
        scheduled,
        attended,

        MonthNo = CASE [month]
            WHEN 'January' THEN 1
            WHEN 'February' THEN 2
            WHEN 'March' THEN 3
            WHEN 'April' THEN 4
            WHEN 'May' THEN 5
            WHEN 'June' THEN 6
            WHEN 'July' THEN 7
            WHEN 'August' THEN 8
            WHEN 'September' THEN 9
            WHEN 'October' THEN 10
            WHEN 'November' THEN 11
            WHEN 'December' THEN 12
        END
    FROM [NWKPI].[dbo].[towermtcdata]
),
CumulativeCTE AS
(
    SELECT
        *,
        SUM(scheduled) OVER
        (
            PARTITION BY designation,
                         [year],
                         ((MonthNo - 1)/3)+1
            ORDER BY MonthNo
        ) AS CumScheduled,

        SUM(attended) OVER
        (
            PARTITION BY designation,
                         [year],
                         ((MonthNo - 1)/3)+1
            ORDER BY MonthNo
        ) AS CumAttended
    FROM CTE
)
UPDATE t
SET
    t.Cumulative_Scheduled = c.CumScheduled,
    t.Cumulative_Attended = c.CumAttended
FROM [NWKPI].[dbo].[towermtcdata] t
JOIN CumulativeCTE c
    ON t.id = c.id;

----------------------------------------------
EXEC sp_rename
  'dbo.towermtcdata.Cumulative_Attended',
  'Cumulative_Achieved',
  'COLUMN';

-- Convert towermtcdata.year from varchar to int
ALTER TABLE [NWKPI].[dbo].[towermtcdata]
ALTER COLUMN [year] INT NULL;