"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, ExternalLink, Eye, EyeOff, Save } from "lucide-react";
import {
  changePassword,
  createRequest,
  createUser,
  editRequest,
  login,
  resetUserPassword,
  setupAdmin,
} from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn } from "cn";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg">
      {pending ? "Saving…" : children}
    </Button>
  );
}

function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
  minLength,
  maxLength,
  min,
  max,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        min={min}
        max={max}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </div>
  );
}

function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "setup" | "login" | "change" }) {
  const action =
    mode === "setup" ? setupAdmin : mode === "login" ? login : changePassword;
  const [state, formAction] = useActionState(action, { error: "" });
  const title =
    mode === "setup"
      ? "Create the admin account"
      : mode === "login"
        ? "Welcome back"
        : "Set a new password";
  const description =
    mode === "setup"
      ? "The first account owns the print queue. This setup closes after you finish."
      : mode === "login"
        ? "Sign in to check your requests and queue position."
        : "Your account needs a personal password before you can continue.";
  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {mode !== "change" && (
            <Field
              label="Username"
              name="username"
              minLength={3}
              maxLength={32}
              autoComplete="username"
            />
          )}
          {mode === "change" && (
            <PasswordField
              label="Current password"
              name="oldPassword"
              autoComplete="current-password"
            />
          )}
          <PasswordField
            label={mode === "change" ? "New password" : "Password"}
            name={mode === "change" ? "newPassword" : "password"}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={mode === "login" ? undefined : 12}
          />
          {mode !== "login" && (
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={12}
            />
          )}
          {mode !== "login" && (
            <p className="text-xs text-muted-foreground">
              Use at least 12 characters.
            </p>
          )}
          <ErrorMessage error={state.error} />
          <Submit>
            {mode === "login" ? (
              <>
                Sign in <ArrowRight />
              </>
            ) : mode === "setup" ? (
              "Create admin account"
            ) : (
              "Change password"
            )}
          </Submit>
        </form>
      </CardContent>
    </Card>
  );
}

export function CreateUserForm() {
  const [state, action] = useActionState(createUser, { error: "" });
  return (
    <Card>
      <CardHeader>
        <CardTitle>New friend account</CardTitle>
        <CardDescription>
          Share the username and temporary password privately. They will change
          it at first sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Username"
            name="username"
            minLength={3}
            maxLength={32}
          />
          <Field
            label="Temporary password"
            name="password"
            type="password"
            minLength={12}
          />
          <div className="space-y-3 sm:col-span-2">
            <ErrorMessage error={state.error} />
            <Submit>Create account</Submit>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetUserPassword, { error: "" });
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Input type="hidden" name="userId" value={userId} />
      <div className="min-w-48 flex-1">
        <Label htmlFor={`reset-${userId}`} className="sr-only">
          New temporary password
        </Label>
        <Input
          id={`reset-${userId}`}
          name="password"
          type="password"
          minLength={12}
          required
          placeholder="New temporary password"
        />
      </div>
      <Submit>Reset password</Submit>
      <ErrorMessage error={state.error} />
      {state.success && (
        <p className="w-full text-xs text-primary" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}

type Filament = {
  id: string;
  name: string;
  imagePath: string | null;
  available: boolean;
};
type RequestDefaults = {
  id: string;
  title: string;
  makerworldUrl: string;
  quantity: number;
  notes: string | null;
  urgent: boolean;
  urgentReason: string | null;
  amsConfirmed: boolean;
  filamentChoices: Array<{ filamentId: string }>;
};

export function RequestForm({
  filaments,
  initial,
}: {
  filaments: Array<Filament>;
  initial?: RequestDefaults;
}) {
  const [state, action] = useActionState(
    initial ? editRequest : createRequest,
    { error: "" },
  );
  const [selected, setSelected] = useState<Array<string>>(
    initial?.filamentChoices.map((f) => f.filamentId) ?? [],
  );
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);

  return (
    <form action={action} className="space-y-7">
      {initial && <Input type="hidden" name="requestId" value={initial.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Print title"
          name="title"
          defaultValue={initial?.title}
          minLength={3}
          maxLength={100}
          placeholder="e.g. Desk cable organizer"
        />
        <Field
          label="Quantity"
          name="quantity"
          type="number"
          min={1}
          max={100}
          defaultValue={initial?.quantity ?? 1}
        />
      </div>
      <div className="space-y-2">
        <Field
          label="MakerWorld model link"
          name="makerworldUrl"
          type="url"
          defaultValue={initial?.makerworldUrl}
          placeholder="https://makerworld.com/en/models/…"
        />
        <Button
          variant="link"
          size="sm"
          nativeButton={false}
          render={
            <a
              href="https://makerworld.com/"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Browse MakerWorld <ExternalLink />
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <Label>Filaments</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick up to four. For multiple colors, check the MakerWorld print
            profile for AMS support.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {filaments.map((filament) => {
            const isDisabled =
              selected.length >= 4 && !selected.includes(filament.id);

            return (
              <Tooltip key={filament.id}>
                <TooltipTrigger
                  render={
                    <button
                      className={cn(
                        "flex cursor-pointer items-center gap-3 border p-3 text-sm",
                        isDisabled && "opacity-50",
                      )}
                    >
                      <Checkbox
                        name="filamentIds"
                        disabled={isDisabled}
                        value={filament.id}
                        defaultChecked={selected.includes(filament.id)}
                        onCheckedChange={(checked) => {
                          setSelected((old) =>
                            checked
                              ? [...old, filament.id]
                              : old.filter((id) => id !== filament.id),
                          );
                        }}
                      />
                      {filament.imagePath && (
                        <Image
                          src={`/api/filament-images/${filament.imagePath}`}
                          alt=""
                          width={48}
                          height={48}
                          unoptimized
                          className="size-12 border object-cover"
                        />
                      )}
                      <span>{filament.name}</span>
                    </button>
                  }
                ></TooltipTrigger>
                <TooltipContent>
                  <Image
                    src={`/api/filament-images/${filament.imagePath}`}
                    alt=""
                    width={512}
                    height={512}
                    unoptimized
                    className="border object-cover"
                  />
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {selected.length > 1 && (
          <label className="flex items-start gap-3 border border-primary/30 bg-primary/5 p-3 text-sm">
            <Checkbox
              name="amsConfirmed"
              value="on"
              defaultChecked={initial?.amsConfirmed}
            />
            <span>
              I checked the MakerWorld print profile and it supports AMS or
              multicolor printing.
            </span>
          </label>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">
          Notes for the printer{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
          maxLength={2000}
          rows={4}
          placeholder="Size, orientation, or anything else worth knowing"
        />
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-3 text-sm">
          <Checkbox
            name="urgent"
            value="on"
            defaultChecked={urgent}
            onCheckedChange={setUrgent}
          />
          This is urgent
        </label>
        {urgent && (
          <div className="space-y-2">
            <Label htmlFor="urgentReason">Why is it urgent?</Label>
            <Textarea
              id="urgentReason"
              name="urgentReason"
              defaultValue={initial?.urgentReason ?? ""}
              minLength={3}
              maxLength={500}
              required
              placeholder="Tell your friend about the deadline or reason"
            />
          </div>
        )}
      </div>
      <ErrorMessage error={state.error} />
      <Submit>
        {initial ? (
          <>
            Save changes <Save />
          </>
        ) : (
          <>
            Add to queue <ArrowRight />
          </>
        )}
      </Submit>
    </form>
  );
}

export function FilamentForm({ initial }: { initial?: Filament }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const image = form.get("image");
    if (image instanceof File && image.size > 5_000_000) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/admin/filaments", {
        method: "POST",
        body: form,
      });
      const data = response.headers
        .get("content-type")
        ?.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : null;
      if (!response.ok) {
        setError(
          data?.error ??
            "The upload was blocked before it reached the app. Please try again.",
        );
        return;
      }
      router.replace("/admin/filaments?saved=1");
      router.refresh();
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {initial && <Input type="hidden" name="filamentId" value={initial.id} />}
      <Field
        label="Filament name"
        name="name"
        defaultValue={initial?.name}
        minLength={2}
        maxLength={80}
        placeholder="e.g. PLA Matte — Forest Green"
      />
      <div className="space-y-2">
        <Label htmlFor={`image-${initial?.id ?? "new"}`}>
          Example photo{" "}
          <span className="font-normal text-muted-foreground">
            (optional, 5 MB max)
          </span>
        </Label>
        <Input
          id={`image-${initial?.id ?? "new"}`}
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required={false}
        />
      </div>
      {initial && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="available"
            value="on"
            defaultChecked={initial.available}
          />
          Available for new requests
        </label>
      )}
      <ErrorMessage error={error} />
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Saving…" : initial ? "Save filament" : "Add filament"}
      </Button>
    </form>
  );
}
