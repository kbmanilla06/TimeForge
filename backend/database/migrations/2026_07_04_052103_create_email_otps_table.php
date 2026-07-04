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
        Schema::create('email_otps', function (Blueprint $table) {
            $table->id();
            // One row per email — a resend overwrites code_hash/expires_at/
            // last_sent_at and resets attempts rather than accumulating rows.
            $table->string('email')->unique();
            $table->string('code_hash');
            $table->dateTime('expires_at');
            $table->dateTime('last_sent_at');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('consumed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_otps');
    }
};
