"use client"
import { useI18n } from "@/i18n/use-i18n";


import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { failure, success } from "@/lib/errors"

/** Render the shared Form primitive with semantic design tokens. */
const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

/** Render the shared FormField primitive with semantic design tokens. */
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

/** Resolve the shared useFormField context without throwing. */
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const form = useFormContext()

  if (!fieldContext) {
    return failure("CONFIGURATION", "FormControl должен находиться внутри FormField")
  }

  if (!itemContext) {
    return failure("CONFIGURATION", "FormControl должен находиться внутри FormItem")
  }

  if (!form) return failure("CONFIGURATION", "Форма должна находиться внутри FormProvider")

  const fieldState = form.getFieldState(fieldContext.name, form.formState)

  const { id } = itemContext

  return success({
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  })
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null)

/** Render the shared FormItem primitive with semantic design tokens. */
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("motion-fade", "space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

/** Render the shared FormLabel primitive with semantic design tokens. */
const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { t } = useI18n();

  const field = useFormField()
  if (!field.ok) return <p role="alert">{t(field.error.message)}</p>
  const { error, formItemId } = field.data

  return (
    <Label
      ref={ref}
      className={cn("motion-fade", error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

/** Render the shared FormControl primitive with semantic design tokens. */
const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { t } = useI18n();

  const field = useFormField()
  if (!field.ok) return <p role="alert">{t(field.error.message)}</p>
  const { error, formItemId, formDescriptionId, formMessageId } = field.data

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

/** Render the shared FormDescription primitive with semantic design tokens. */
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { t } = useI18n();

  const field = useFormField()
  if (!field.ok) return <p role="alert">{t(field.error.message)}</p>
  const { formDescriptionId } = field.data

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("motion-fade", "text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

/** Render the shared FormMessage primitive with semantic design tokens. */
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { t } = useI18n();

  const field = useFormField()
  if (!field.ok) return <p role="alert">{t(field.error.message)}</p>
  const { error, formMessageId } = field.data
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("motion-fade", "text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
