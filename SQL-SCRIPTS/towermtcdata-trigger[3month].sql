CREATE TRIGGER dbo.trg_towermtcdata_Cumulative
ON dbo.towermtcdata
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
                END - 1) / 3
            )
        FROM inserted
    ),
    Recalc AS
    (
        SELECT
            T.Id,

            SUM(T.Scheduled) OVER
            (
                PARTITION BY
                    T.Designation,
                    T.[Year],
                    (
                        (CASE T.[Month]
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
                        END - 1) / 3
                    )
                ORDER BY
                    CASE T.[Month]
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

            SUM(T.Attended) OVER
            (
                PARTITION BY
                    T.Designation,
                    T.[Year],
                    (
                        (CASE T.[Month]
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
                        END - 1) / 3
                    )
                ORDER BY
                    CASE T.[Month]
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

        FROM dbo.towermtcdata T
        INNER JOIN AffectedGroups AG
            ON AG.Designation = T.Designation
           AND AG.[Year] = T.[Year]
           AND AG.CycleNo =
                (
                    (CASE T.[Month]
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
                    END - 1) / 3
                )
    )

    UPDATE T
    SET
        T.Cumulative_Scheduled = R.Cum_Sched,
        T.Cumulative_Achieved = R.Cum_Achieved
    FROM dbo.towermtcdata T
    INNER JOIN Recalc R
        ON T.Id = R.Id;

END;
GO