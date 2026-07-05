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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            // Nullable: a failed login has no authenticated actor yet.
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            // Polymorphic-shaped but not wired as a full morphTo relation
            // (no need for it here) — e.g. subject_type App\Models\Timesheet.
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            // Never passwords, OTPs, tokens, or other secrets — enforced by
            // convention at every call site, not by this column itself.
            $table->json('metadata')->nullable();
            $table->string('ip_address')->nullable();
            // No updated_at: audit_logs is append-only, nothing is ever
            // updated (enforced in the model, not just by omission here).
            $table->timestamp('created_at')->useCurrent();

            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
            $table->index('actor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
