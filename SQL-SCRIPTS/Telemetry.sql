-- ==========================================
-- TELEMETRY TABLE
-- ==========================================
CREATE TABLE [dbo].[Telemetry]
(
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Designation] NVARCHAR(100) NOT NULL,
    [Year] INT NOT NULL,
    [Month] INT NOT NULL,
    [Percentage] DECIMAL(5,2) NOT NULL,

    CONSTRAINT [PK_Telemetry]
        PRIMARY KEY ([Id]),

    CONSTRAINT [UQ_Telemetry_Designation_Year_Month]
        UNIQUE ([Designation], [Year], [Month])
);
GO

ALTER TABLE [dbo].[Telemetry]
ADD [Node_Count] SMALLINT NULL;


-- ==========================================
-- POWER AND AC TABLE
-- ==========================================
CREATE TABLE [dbo].[PowerAndAC]
(
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Designation] NVARCHAR(100) NOT NULL,
    [Year] INT NOT NULL,
    [Month] INT NOT NULL,
    [Scheduled] INT NOT NULL,
    [Attended] INT NOT NULL,
    [Cumulative_Sched] INT NOT NULL,
    [Cumulative_Achieved] INT NOT NULL,

    CONSTRAINT [PK_PowerAndAC]
        PRIMARY KEY ([Id]),

    CONSTRAINT [UQ_PowerAndAC_Designation_Year_Month]
        UNIQUE ([Designation], [Year], [Month])
);
GO


