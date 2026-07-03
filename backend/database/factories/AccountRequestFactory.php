<?php

namespace Database\Factories;

use App\Enums\AccountRequestStatus;
use App\Models\AccountRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AccountRequest>
 */
class AccountRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->pending(),
            'status' => AccountRequestStatus::Submitted,
            'terms_accepted_at' => now(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AccountRequestStatus::Approved,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AccountRequestStatus::Rejected,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
            'rejection_reason' => 'Could not verify employment.',
        ]);
    }
}
