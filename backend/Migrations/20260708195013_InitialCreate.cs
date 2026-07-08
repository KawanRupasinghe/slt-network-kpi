using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.CreateTable(
                name: "AgedNetworkFailureMetrics",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    area_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    month = table.Column<int>(type: "int", nullable: false),
                    year = table.Column<int>(type: "int", nullable: false),
                    percentage = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    remarks = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgedNetworkFailureMetrics", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "BbAnwKpi",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    network_engineer_kpi = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    division = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    section = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    kpi_percent = table.Column<decimal>(type: "decimal(6,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BbAnwKpi", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "EmailRecipients",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    email = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    v = table.Column<byte>(type: "tinyint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailRecipients", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "EnterpriseKpi",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    network_engineer_kpi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    division = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    section = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    kpi_percent = table.Column<decimal>(type: "decimal(6,3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EnterpriseKpi", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ipnwmtcdata",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    designation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    year = table.Column<string>(type: "varchar(10)", nullable: true),
                    month = table.Column<string>(type: "varchar(10)", nullable: true),
                    scheduled = table.Column<int>(type: "int", nullable: true),
                    attended = table.Column<int>(type: "int", nullable: true),
                    Cumulative_Sched = table.Column<int>(type: "int", nullable: false),
                    Cumulative_Achieved = table.Column<int>(type: "int", nullable: false),
                    is_verified = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ipnwmtcdata", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "IpNwOpKpi",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    network_engineer_kpi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    division = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    section = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    kpi_percent = table.Column<double>(type: "float", nullable: true),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IpNwOpKpi", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "KpiDefinition",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    perspectives = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    strategicObjectives = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    keyPerformanceIndicators = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    descriptionOfKPI = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    weightage = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    pointsApplicable = table.Column<int>(type: "int", nullable: false),
                    totalPoints = table.Column<int>(type: "int", nullable: false),
                    category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    engineerResponsible = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    contactNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    createdAt = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    updatedAt = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiDefinition", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "msanmtcdata",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    designation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    year = table.Column<int>(type: "int", nullable: true),
                    month = table.Column<string>(type: "varchar(10)", nullable: true),
                    scheduled = table.Column<int>(type: "int", nullable: true),
                    attended = table.Column<int>(type: "int", nullable: true),
                    Cumulative_Sched = table.Column<int>(type: "int", nullable: false),
                    Cumulative_Achieved = table.Column<int>(type: "int", nullable: false),
                    is_verified = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_msanmtcdata", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "mtncroutinetable1",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    no = table.Column<byte>(type: "tinyint", nullable: false),
                    kpi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    target = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    calculation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    platform = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    responsibleDGM = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    definedOLADetails = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    dataSources = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    createdAt = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    updatedAt = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    v = table.Column<byte>(type: "tinyint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mtncroutinetable1", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "OtherKpi",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    network_engineer_kpi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    division = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    section = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    kpi_percent = table.Column<decimal>(type: "decimal(6,3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtherKpi", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OtherOperatorKpi",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    network_engineer_kpi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    division = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtherOperatorKpi", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OtnOp1",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NetworkEngineerKpi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Division = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Section = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    KpiPercent = table.Column<decimal>(type: "decimal(6,3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtnOp1", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OtnOp2",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NetworkEngineerKpi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Division = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Section = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    KpiPercent = table.Column<decimal>(type: "decimal(6,3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtnOp2", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OverallKpiResult",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    KpiCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    KpiDefinitionId = table.Column<int>(type: "int", nullable: false),
                    KpiName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Platform = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AreaCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TargetValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    AchievedValue = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    PointsApplicable = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    PointsAchieved = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    OverallKpiValuePercent = table.Column<decimal>(type: "decimal(10,4)", nullable: false),
                    Month = table.Column<byte>(type: "tinyint", nullable: false),
                    Year = table.Column<short>(type: "smallint", nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OverallKpiResult", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Page",
                schema: "dbo",
                columns: table => new
                {
                    PageId = table.Column<byte>(type: "tinyint", nullable: false),
                    PageCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PageName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Page", x => x.PageId);
                });

            migrationBuilder.CreateTable(
                name: "PowerAndAC",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Designation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Scheduled = table.Column<int>(type: "int", nullable: false),
                    Attended = table.Column<int>(type: "int", nullable: false),
                    Cumulative_Sched = table.Column<int>(type: "int", nullable: false),
                    Cumulative_Achieved = table.Column<int>(type: "int", nullable: false),
                    is_verified = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PowerAndAC", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "regiondata",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    region = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    province = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    network_engineer = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EngName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lea_code = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_regiondata", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                schema: "dbo",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.RoleId);
                });

            migrationBuilder.CreateTable(
                name: "rtom_area_lookup",
                columns: table => new
                {
                    area_code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    display_name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rtom_area_lookup", x => x.area_code);
                });

            migrationBuilder.CreateTable(
                name: "ServiceFulfilmentKpi",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    kpi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    target = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    calculation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    platform = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    responsibledgm = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    definedoladetails = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    weightage = table.Column<int>(type: "int", nullable: false),
                    datasources = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    month = table.Column<byte>(type: "tinyint", nullable: false),
                    year = table.Column<short>(type: "smallint", nullable: false),
                    updatedAt = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceFulfilmentKpi", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "slbnmtcdata",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    designation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    year = table.Column<int>(type: "int", nullable: true),
                    month = table.Column<string>(type: "varchar(10)", nullable: true),
                    scheduled = table.Column<int>(type: "int", nullable: true),
                    attended = table.Column<int>(type: "int", nullable: true),
                    Cumulative_Sched = table.Column<int>(type: "int", nullable: false),
                    Cumulative_Achieved = table.Column<int>(type: "int", nullable: false),
                    is_verified = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_slbnmtcdata", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Telemetry",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Designation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Percentage = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Node_Count = table.Column<short>(type: "smallint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Telemetry", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tmtable1",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    no = table.Column<byte>(type: "tinyint", nullable: true),
                    kpi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    target = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    calculation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    createdAt = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    updatedAt = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tmtable1", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "towermtcdata",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    designation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    year = table.Column<int>(type: "int", nullable: true),
                    month = table.Column<string>(type: "nchar(10)", nullable: true),
                    scheduled = table.Column<int>(type: "int", nullable: true),
                    attended = table.Column<int>(type: "int", nullable: true),
                    Cumulative_Scheduled = table.Column<int>(type: "int", nullable: false),
                    Cumulative_Achieved = table.Column<int>(type: "int", nullable: false),
                    is_verified = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_towermtcdata", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "BbAnwKpiNode",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    bb_anw_kpi_id = table.Column<int>(type: "int", nullable: false),
                    node_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    unavailable_minutes = table.Column<int>(type: "int", nullable: true),
                    total_minutes = table.Column<long>(type: "bigint", nullable: true),
                    total_nodes = table.Column<int>(type: "int", nullable: true),
                    month = table.Column<byte>(type: "tinyint", nullable: false),
                    year = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BbAnwKpiNode", x => x.id);
                    table.ForeignKey(
                        name: "FK_BbAnwKpiNode_BbAnwKpi_bb_anw_kpi_id",
                        column: x => x.bb_anw_kpi_id,
                        principalSchema: "dbo",
                        principalTable: "BbAnwKpi",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EnterpriseKpiMetrics",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EnterpriseKpiId = table.Column<int>(type: "int", nullable: false),
                    Site = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    KpiValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    month = table.Column<int>(type: "int", nullable: false),
                    year = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EnterpriseKpiMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EnterpriseKpiMetrics_EnterpriseKpi",
                        column: x => x.EnterpriseKpiId,
                        principalSchema: "dbo",
                        principalTable: "EnterpriseKpi",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IpNwOpKpiMetrics",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ip_nw_op_kpi_id = table.Column<int>(type: "int", nullable: false),
                    area_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    unavailable_minutes = table.Column<int>(type: "int", nullable: true),
                    total_minutes = table.Column<int>(type: "int", nullable: true),
                    total_nodes = table.Column<int>(type: "int", nullable: true),
                    month = table.Column<byte>(type: "tinyint", nullable: false),
                    year = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IpNwOpKpiMetrics", x => x.id);
                    table.ForeignKey(
                        name: "FK_IpNwOpKpiMetrics_IpNwOpKpi",
                        column: x => x.ip_nw_op_kpi_id,
                        principalSchema: "dbo",
                        principalTable: "IpNwOpKpi",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OtherKpiMetrics",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OtherKpiId = table.Column<int>(type: "int", nullable: false),
                    AreaCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    KpiValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    month = table.Column<int>(type: "int", nullable: false),
                    year = table.Column<int>(type: "int", nullable: false),
                    createdAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtherKpiMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OtherKpiMetrics_OtherKpi",
                        column: x => x.OtherKpiId,
                        principalSchema: "dbo",
                        principalTable: "OtherKpi",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OtherOperatorKpiMetrics",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OtherOperatorKpiId = table.Column<int>(type: "int", nullable: false),
                    Site = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Year = table.Column<short>(type: "smallint", nullable: false),
                    Month = table.Column<byte>(type: "tinyint", nullable: false),
                    kpi_value = table.Column<decimal>(type: "decimal(18,4)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtherOperatorKpiMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OtherOperatorKpiMetrics_OtherOperatorKpi",
                        column: x => x.OtherOperatorKpiId,
                        principalSchema: "dbo",
                        principalTable: "OtherOperatorKpi",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OtherOperatorTargets",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OtherOperatorKpiId = table.Column<int>(type: "int", nullable: false),
                    Section = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Month = table.Column<byte>(type: "tinyint", nullable: false),
                    Year = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtherOperatorTargets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OtherOperatorTargets_OtherOperatorKpi",
                        column: x => x.OtherOperatorKpiId,
                        principalSchema: "dbo",
                        principalTable: "OtherOperatorKpi",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OtnOp1Metrics",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OtnOp1Id = table.Column<int>(type: "int", nullable: false),
                    Site = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    UnavailableMinutes = table.Column<int>(type: "int", nullable: false),
                    TotalMinutes = table.Column<int>(type: "int", nullable: false),
                    TotalNodes = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<short>(type: "smallint", nullable: false),
                    Month = table.Column<byte>(type: "tinyint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtnOp1Metrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Otn1M_Otn1",
                        column: x => x.OtnOp1Id,
                        principalSchema: "dbo",
                        principalTable: "OtnOp1",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OtnOp2Metrics",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OtnOp2Id = table.Column<int>(type: "int", nullable: false),
                    Site = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TotalFailedLinks = table.Column<int>(type: "int", nullable: false),
                    LinksSlaNotViolated = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<short>(type: "smallint", nullable: false),
                    Month = table.Column<byte>(type: "tinyint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtnOp2Metrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Otn2M_Otn2",
                        column: x => x.OtnOp2Id,
                        principalSchema: "dbo",
                        principalTable: "OtnOp2",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                schema: "dbo",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ServiceId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastLogin = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_Users_Roles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "dbo",
                        principalTable: "Roles",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ServiceFulfilmentKpiMetrics",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ServiceFulfilmentKpiId = table.Column<int>(type: "int", nullable: false),
                    area_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    kpi_value = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    month = table.Column<byte>(type: "tinyint", nullable: false),
                    year = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceFulfilmentKpiMetrics", x => x.id);
                    table.ForeignKey(
                        name: "FK_ServiceFulfilmentKpiMetrics_ServiceFulfilmentKpi",
                        column: x => x.ServiceFulfilmentKpiId,
                        principalSchema: "dbo",
                        principalTable: "ServiceFulfilmentKpi",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlatformKpiAssignment",
                schema: "dbo",
                columns: table => new
                {
                    AssignmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PageId = table.Column<byte>(type: "tinyint", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformKpiAssignment", x => x.AssignmentId);
                    table.ForeignKey(
                        name: "FK_PlatformKpiAssignment_Page_PageId",
                        column: x => x.PageId,
                        principalSchema: "dbo",
                        principalTable: "Page",
                        principalColumn: "PageId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlatformKpiAssignment_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserPageAccess",
                schema: "dbo",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PageId = table.Column<byte>(type: "tinyint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPageAccess", x => new { x.UserId, x.PageId });
                    table.ForeignKey(
                        name: "FK_UserPageAccess_Page_PageId",
                        column: x => x.PageId,
                        principalSchema: "dbo",
                        principalTable: "Page",
                        principalColumn: "PageId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPageAccess_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "dbo",
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_AgedNetworkFailureMetrics_Row",
                schema: "dbo",
                table: "AgedNetworkFailureMetrics",
                columns: new[] { "area_code", "month", "year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_BbAnwKpiNode_Row",
                schema: "dbo",
                table: "BbAnwKpiNode",
                columns: new[] { "bb_anw_kpi_id", "node_code", "month", "year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_EnterpriseKpiMetrics_Row",
                schema: "dbo",
                table: "EnterpriseKpiMetrics",
                columns: new[] { "EnterpriseKpiId", "Site", "month", "year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_IpNwOpKpiMetrics",
                schema: "dbo",
                table: "IpNwOpKpiMetrics",
                columns: new[] { "ip_nw_op_kpi_id", "area_code", "month", "year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_OtherKpiMetrics_Row",
                schema: "dbo",
                table: "OtherKpiMetrics",
                columns: new[] { "OtherKpiId", "AreaCode", "month", "year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OtherOperatorKpiMetrics_OtherOperatorKpiId",
                schema: "dbo",
                table: "OtherOperatorKpiMetrics",
                column: "OtherOperatorKpiId");

            migrationBuilder.CreateIndex(
                name: "IX_OtherOperatorTargets_OtherOperatorKpiId",
                schema: "dbo",
                table: "OtherOperatorTargets",
                column: "OtherOperatorKpiId");

            migrationBuilder.CreateIndex(
                name: "UQ_Otn1M",
                schema: "dbo",
                table: "OtnOp1Metrics",
                columns: new[] { "OtnOp1Id", "Site", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_Otn2M",
                schema: "dbo",
                table: "OtnOp2Metrics",
                columns: new[] { "OtnOp2Id", "Site", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_OverallKpiResult_Row",
                schema: "dbo",
                table: "OverallKpiResult",
                columns: new[] { "KpiDefinitionId", "AreaCode", "Month", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Page_PageCode",
                schema: "dbo",
                table: "Page",
                column: "PageCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlatformKpiAssignment_PageId",
                schema: "dbo",
                table: "PlatformKpiAssignment",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformKpiAssignment_UserId_PageId",
                schema: "dbo",
                table: "PlatformKpiAssignment",
                columns: new[] { "UserId", "PageId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_PowerAndAC_Designation_Year_Month",
                schema: "dbo",
                table: "PowerAndAC",
                columns: new[] { "Designation", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_RoleName",
                schema: "dbo",
                table: "Roles",
                column: "RoleName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_ServiceFulfilmentKpiMetrics_Row",
                schema: "dbo",
                table: "ServiceFulfilmentKpiMetrics",
                columns: new[] { "ServiceFulfilmentKpiId", "area_code", "month", "year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_Telemetry_Designation_Year_Month",
                schema: "dbo",
                table: "Telemetry",
                columns: new[] { "Designation", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPageAccess_PageId",
                schema: "dbo",
                table: "UserPageAccess",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                schema: "dbo",
                table: "Users",
                column: "Email",
                unique: true,
                filter: "[Email] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                schema: "dbo",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_ServiceId",
                schema: "dbo",
                table: "Users",
                column: "ServiceId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgedNetworkFailureMetrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "BbAnwKpiNode",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "EmailRecipients",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "EnterpriseKpiMetrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "ipnwmtcdata",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "IpNwOpKpiMetrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "KpiDefinition",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "msanmtcdata",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "mtncroutinetable1",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtherKpiMetrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtherOperatorKpiMetrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtherOperatorTargets",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtnOp1Metrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtnOp2Metrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OverallKpiResult",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "PlatformKpiAssignment",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "PowerAndAC",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "regiondata");

            migrationBuilder.DropTable(
                name: "rtom_area_lookup");

            migrationBuilder.DropTable(
                name: "ServiceFulfilmentKpiMetrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "slbnmtcdata",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "Telemetry",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tmtable1",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "towermtcdata",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "UserPageAccess",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "BbAnwKpi",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "EnterpriseKpi",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "IpNwOpKpi",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtherKpi",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtherOperatorKpi",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtnOp1",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "OtnOp2",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "ServiceFulfilmentKpi",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "Page",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "Users",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "Roles",
                schema: "dbo");
        }
    }
}
