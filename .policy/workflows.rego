package workflows

deny[msg] {
  not input.permissions
  msg := "workflow must declare top-level permissions"
}

deny[msg] {
  some job, i
  step := input.jobs[job].steps[i]
  startswith(step.uses, "actions/checkout@")
  not endswith(step.uses, "@v4")
  msg := "actions/checkout must use v4"
}

deny[msg] {
  some job, i
  step := input.jobs[job].steps[i]
  startswith(step.uses, "actions/setup-node@")
  not endswith(step.uses, "@v4")
  msg := "actions/setup-node must use v4"
}
