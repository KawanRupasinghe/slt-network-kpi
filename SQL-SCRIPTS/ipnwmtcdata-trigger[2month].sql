ALTER TABLE [NWKPI].[dbo].[ipnwmtcdata]
DROP COLUMN [cumulative_count];


CREATE TRIGGER dbo.trg_ipnwmtcdata_Cumulative
ON dbo.ipnwmtcdata
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH AffectedGroups AS
    (
        SELECT DISTINCT
            Designation,
            [Year],
            CycleNo =
            (
                (CASE [Month]
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
                END - 1) / 2
            )
        FROM inserted
    ),
    Recalc AS
    (
        SELECT
            P.Id,

            SUM(P.Scheduled) OVER
            (
                PARTITION BY
                    P.Designation,
                    P.[Year],
                    (
                        (CASE P.[Month]
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
                        END - 1) / 2
                    )
                ORDER BY
                    CASE P.[Month]
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
                ROWS UNBOUNDED PRECEDING
            ) AS Cum_Sched,

            SUM(P.Attended) OVER
            (
                PARTITION BY
                    P.Designation,
                    P.[Year],
                    (
                        (CASE P.[Month]
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
                        END - 1) / 2
                    )
                ORDER BY
                    CASE P.[Month]
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
                ROWS UNBOUNDED PRECEDING
            ) AS Cum_Achieved

        FROM dbo.ipnwmtcdata P
        INNER JOIN AffectedGroups AG
            ON AG.Designation = P.Designation
           AND AG.[Year] = P.[Year]
           AND AG.CycleNo =
                (
                    (CASE P.[Month]
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
                    END - 1) / 2
                )
    )

    UPDATE P
    SET
        P.Cumulative_Sched = R.Cum_Sched,
        P.Cumulative_Achieved = R.Cum_Achieved
    FROM dbo.ipnwmtcdata P
    INNER JOIN Recalc R
        ON P.Id = R.Id;

END;
GO