<?php

namespace App\Ai;

use App\Enums\AiOutputType;

/**
 * Provider-agnostic contract for AI text generation. Implementations must
 * derive output strictly from the supplied source data (PRD §7.8: "AI
 * implementation must not invent business data") and must never receive
 * more data than the gatherers collected — the same array is persisted to
 * ai_outputs.source_data as the audit snapshot of exactly what the
 * provider saw.
 */
interface AiProvider
{
    /**
     * @param  array<string, mixed>  $sourceData
     */
    public function generate(AiOutputType $type, array $sourceData): string;

    /**
     * Identifier stored on every output and shown in the UI's
     * "AI-generated" labeling.
     */
    public function name(): string;
}
