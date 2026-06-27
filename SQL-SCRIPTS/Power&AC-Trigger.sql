IF OBJECT_ID('dbo.trg_PowerAndAC_Cumulative', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_PowerAndAC_Cumulative;
GO

CREATE TRIGGER dbo.trg_PowerAndAC_Cumulative
ON dbo.PowerAndAC
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH AffectedGroups AS
    (
        SELECT DISTINCT
            Designation,
            [Year],
            QuarterNo = (([Month]-1)/3)
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
                    ((P.[Month]-1)/3)
                ORDER BY
                    P.[Month]
                ROWS UNBOUNDED PRECEDING
            ) AS Cum_Sched,

            SUM(P.Attended) OVER
            (
                PARTITION BY
                    P.Designation,
                    P.[Year],
                    ((P.[Month]-1)/3)
                ORDER BY
                    P.[Month]
                ROWS UNBOUNDED PRECEDING
            ) AS Cum_Achieved

        FROM dbo.PowerAndAC P
        INNER JOIN AffectedGroups AG
            ON AG.Designation = P.Designation
           AND AG.[Year] = P.[Year]
           AND AG.QuarterNo = ((P.[Month]-1)/3)
    )

    UPDATE P
    SET
        P.Cumulative_Sched = R.Cum_Sched,
        P.Cumulative_Achieved = R.Cum_Achieved
    FROM dbo.PowerAndAC P
    INNER JOIN Recalc R
        ON P.Id = R.Id;

END;
GO


---- only need to run the 1st time ----
;WITH Recalc AS
(
    SELECT
        Id,

        SUM(Scheduled) OVER
        (
            PARTITION BY Designation,[Year],(([Month]-1)/3)
            ORDER BY [Month]
            ROWS UNBOUNDED PRECEDING
        ) AS Cum_Sched,

        SUM(Attended) OVER
        (
            PARTITION BY Designation,[Year],(([Month]-1)/3)
            ORDER BY [Month]
            ROWS UNBOUNDED PRECEDING
        ) AS Cum_Achieved

    FROM dbo.PowerAndAC
)
UPDATE P
SET
    Cumulative_Sched = R.Cum_Sched,
    Cumulative_Achieved = R.Cum_Achieved
FROM dbo.PowerAndAC P
INNER JOIN Recalc R
    ON P.Id = R.Id;