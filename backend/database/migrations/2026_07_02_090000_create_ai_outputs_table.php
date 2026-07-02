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
        Schema::create('ai_outputs', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            // Exactly one of user_id/department_id is set, depending on the
            // output type (enforced by request validation, not schema, so the
            // table stays open to future subject shapes).
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            // Full audit snapshot of the gathered records the output was
            // derived from (Sprint 11 prompt-storage/audit decision).
            $table->json('source_data');
            $table->text('content');
            $table->string('provider');
            $table->string('prompt_version');
            $table->foreignId('generated_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['type', 'user_id', 'period_start']);
            $table->index(['type', 'department_id', 'period_start']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_outputs');
    }
};
