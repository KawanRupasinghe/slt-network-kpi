CREATE TRIGGER dbo.trg_msanmtcdata_Cumulative
ON dbo.msanmtcdata
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
                END - 1) / 6
            )
        FROM inserted
    ),
    Recalc AS
    (
        SELECT
            M.Id,

            SUM(M.Scheduled) OVER
            (
                PARTITION BY
                    M.Designation,
                    M.[Year],
                    (
                        (CASE M.[Month]
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
                        END - 1) / 6
                    )
                ORDER BY
                    CASE M.[Month]
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

            SUM(M.Attended) OVER
            (
                PARTITION BY
                    M.Designation,
                    M.[Year],
                    (
                        (CASE M.[Month]
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
                        END - 1) / 6
                    )
                ORDER BY
                    CASE M.[Month]
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

        FROM dbo.msanmtcdata M
        INNER JOIN AffectedGroups AG
            ON AG.Designation = M.Designation
           AND AG.[Year] = M.[Year]
           AND AG.CycleNo =
                (
                    (CASE M.[Month]
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
                    END - 1) / 6
                )
    )

    UPDATE M
    SET
        M.Cumulative_Sched = R.Cum_Sched,
        M.Cumulative_Achieved = R.Cum_Achieved
    FROM dbo.msanmtcdata M
    INNER JOIN Recalc R
        ON M.Id = R.Id;

END;
GO