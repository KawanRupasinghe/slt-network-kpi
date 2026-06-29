SELECT TOP (1000) [id]
      ,[designation]
      ,[year]
      ,[month]
      ,[scheduled]
      ,[attended]
      ,[cumulative_count]
  FROM [NWKPI].[dbo].[ipnwmtcdata]

  ALTER TABLE [NWKPI].[dbo].[ipnwmtcdata]
DROP COLUMN [cumulative_count];

ALTER TABLE [NWKPI].[dbo].[ipnwmtcdata]
ADD
    [Cumulative_Sched] INT NOT NULL DEFAULT(0),
    [Cumulative_Achieved] INT NOT NULL DEFAULT(0);

    SELECT
    COLUMN_NAME,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ipnwmtcdata';


SELECT DISTINCT [year]
FROM [NWKPI].[dbo].[ipnwmtcdata];

ALTER TABLE [NWKPI].[dbo].[ipnwmtcdata]
ALTER COLUMN [year] INT NOT NULL;