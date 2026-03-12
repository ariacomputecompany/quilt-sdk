export interface ToolFunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

export const QUILT_TOOLS: ToolFunctionDefinition[] = [
  {
    type: "function",
    function: {
      name: "quilt_containers_list",
      description: "List containers for the current tenant",
      parameters: {
        type: "object",
        properties: { state: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_create",
      description: "Create a new container",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          image: { type: "string", enum: ["prod", "prod-gui"] },
          command: { type: "array", items: { type: "string" } },
        },
        additionalProperties: true,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_get",
      description: "Get a container by id",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_start",
      description: "Start a container",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_stop",
      description: "Stop a container",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, execution: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_kill",
      description: "Force kill a container",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_remove",
      description: "Remove a container",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, execution: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_exec",
      description: "Execute a command in a container",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          command: {
            oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          },
        },
        required: ["id", "command"],
        additionalProperties: true,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_logs",
      description: "Get logs for a container",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, limit: { type: "number" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_containers_metrics",
      description: "Get metrics for a container",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_volumes_list",
      description: "List volumes",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_volumes_create",
      description: "Create a volume",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          labels: { type: "object" },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_volumes_get",
      description: "Get a volume by name",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_volumes_delete",
      description: "Delete a volume",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, execution: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_projects_list",
      description: "List projects",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_projects_create",
      description: "Create a project",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, description: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_notifications_list",
      description: "List notifications",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" }, unread_only: { type: "boolean" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_system_health",
      description: "Check health endpoint",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_system_info",
      description: "Get system information",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_terminal_create_session",
      description: "Create a terminal session",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["master", "container"] },
          container_id: { type: "string" },
          shell: { type: "string" },
          cols: { type: "number" },
          rows: { type: "number" },
        },
        required: ["target"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_functions_list",
      description: "List serverless functions",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_functions_invoke",
      description: "Invoke function by id",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, payload: { type: "object" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_clusters_list",
      description: "List clusters",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_clusters_create",
      description: "Create cluster",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, region: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_platform_get_operation",
      description: "Get operation status",
      parameters: {
        type: "object",
        properties: { operation_id: { type: "string" } },
        required: ["operation_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quilt_platform_icc_messages",
      description: "Query ICC messages",
      parameters: {
        type: "object",
        properties: {
          container_id: { type: "string" },
          from_seq: { type: "number" },
          to_seq: { type: "number" },
          state: { type: "string" },
          limit: { type: "number" },
        },
        required: ["container_id"],
        additionalProperties: false,
      },
    },
  },
];
