CREATE TRIGGER dbo.trg_slbnmtcdata_Cumulative
ON dbo.slbnmtcdata
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
            S.Id,

            SUM(S.Scheduled) OVER
            (
                PARTITION BY
                    S.Designation,
                    S.[Year],
                    (
                        (CASE S.[Month]
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
                    CASE S.[Month]
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

            SUM(S.Attended) OVER
            (
                PARTITION BY
                    S.Designation,
                    S.[Year],
                    (
                        (CASE S.[Month]
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
                    CASE S.[Month]
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

        FROM dbo.slbnmtcdata S
        INNER JOIN AffectedGroups AG
            ON AG.Designation = S.Designation
           AND AG.[Year] = S.[Year]
           AND AG.CycleNo =
                (
                    (CASE S.[Month]
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

    UPDATE S
    SET
        S.Cumulative_Sched = R.Cum_Sched,
        S.Cumulative_Achieved = R.Cum_Achieved
    FROM dbo.slbnmtcdata S
    INNER JOIN Recalc R
        ON S.Id = R.Id;

END;
GO