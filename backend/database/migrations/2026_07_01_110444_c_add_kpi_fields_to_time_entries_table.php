<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('time_entries', function (Blueprint $table) {
            $table->foreignId('kpi_assignment_id')->nullable()->after('timesheet_id')
                ->constrained()->nullOnDelete();
            $table->decimal('kpi_progress_value', 12, 2)->nullable()->after('kpi_assignment_id');
            $table->dateTime('kpi_progress_applied_at')->nullable()->after('kpi_progress_value');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('kpi_assignment_id');
            $table->dropColumn(['kpi_progress_value', 'kpi_progress_applied_at']);
        });
    }
};
