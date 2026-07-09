<?php

namespace App\Ai;

use Illuminate\Support\Str;

class AiAnonymizer
{
    private array $nameMap = [];
    private int $counter = 0;

    public function anonymize(array $data): array
    {
        $this->nameMap = [];
        $this->counter = 0;

        // First pass: collect all user names to anonymize
        $this->collectNames($data);

        // Second pass: recursively replace names and emails
        return $this->replaceValues($data);
    }

    private function collectNames(mixed $data): void
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (in_array($key, ['user_name', 'assignee', 'name', 'reviewed_by_name', 'employees', 'employees_with_unsubmitted_days', 'employees_with_open_timers', 'members_with_no_logged_time', 'members_with_unsubmitted_days'], true)) {
                    if (is_string($value)) {
                        $this->registerName($value);
                    } elseif (is_array($value)) {
                        foreach ($value as $item) {
                            if (is_string($item)) {
                                $this->registerName($item);
                            }
                        }
                    }
                }
                $this->collectNames($value);
            }
        }
    }

    private function registerName(string $name): void
    {
        $name = trim($name);
        if ($name === '' || isset($this->nameMap[$name])) {
            return;
        }

        // Avoid mapping system labels or department names
        if (Str::contains($name, ['Admin', 'Engineering', 'Marketing', 'HR', 'Finance'])) {
            return;
        }

        $alias = 'Employee ' . chr(65 + ($this->counter % 26));
        if ($this->counter >= 26) {
            $alias .= intdiv($this->counter, 26);
        }
        $this->nameMap[$name] = $alias;
        $this->counter++;
    }

    private function replaceValues(mixed $data): mixed
    {
        if (is_array($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                $result[$key] = $this->replaceValues($value);
            }
            return $result;
        }

        if (is_string($data)) {
            // Replace emails
            if (filter_var($data, FILTER_VALIDATE_EMAIL)) {
                $prefix = explode('@', $data)[0];
                return 'employee-' . strtolower(Str::slug($prefix)) . '@timeforge.test';
            }

            // Replace registered names
            foreach ($this->nameMap as $realName => $alias) {
                if ($realName === $data) {
                    return $alias;
                }
                $data = str_replace($realName, $alias, $data);
            }

            return $data;
        }

        return $data;
    }
}
